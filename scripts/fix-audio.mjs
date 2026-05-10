#!/usr/bin/env node

/**
 * Fix audio channel metadata in Firebase Storage videos.
 *
 * Many uploaded videos have container metadata claiming 2 audio channels (stereo)
 * but actual audio data is 1 channel (mono). Chrome's decoder rejects these with:
 * "DECODER_ERROR_NOT_SUPPORTED: Audio configuration specified 2 channels,
 *  but FFmpeg thinks the file contains 1 channels"
 *
 * This script re-muxes audio to mono AAC (-c:a aac -ac 1) while copying
 * the video stream unchanged (-c:v copy).
 *
 * Usage: GOOGLE_APPLICATION_CREDENTIALS=... node scripts/fix-audio.mjs
 */

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { execSync } from "child_process";
import { existsSync, mkdirSync, unlinkSync, statSync } from "fs";
import path from "path";

const PROJECT_ID = "shorttv-videos";
const BUCKET_NAME = "shorttv-videos.firebasestorage.app";
const WORK_DIR = "/tmp/shorttv-audio-fix";
const CONCURRENCY = 3;

const app = initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
  storageBucket: BUCKET_NAME,
});

const db = getFirestore(app);
const bucket = getStorage(app).bucket();

if (!existsSync(WORK_DIR)) mkdirSync(WORK_DIR, { recursive: true });

function storageUrl(storagePath) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(storagePath)}?alt=media`;
}

function needsFix(videoUrl) {
  try {
    const probe = execSync(
      `ffprobe -v quiet -print_format json -show_streams "${videoUrl}"`,
      { timeout: 15000, encoding: "utf-8" }
    );
    const data = JSON.parse(probe);
    const audio = data.streams?.find((s) => s.codec_type === "audio");
    if (!audio) return false;
    // Fix if container reports stereo but we suspect the actual data is mono
    // (Chrome's decoder will reject the mismatch)
    return audio.channels === 2 && audio.channel_layout === "stereo";
  } catch {
    return false;
  }
}

async function fixEpisode(videoDoc, episodeDoc) {
  const videoData = videoDoc.data();
  const epData = episodeDoc.data();
  const slug = videoData.slug;
  const epNum = epData.number;
  const videoUrl = epData.videoUrl;

  if (!videoUrl) return { slug, epNum, status: "skipped", reason: "no URL" };

  // Check if this video needs fixing
  if (!needsFix(videoUrl)) {
    return { slug, epNum, status: "skipped", reason: "audio OK" };
  }

  const localIn = path.join(WORK_DIR, `${slug}_ep${epNum}_in.mp4`);
  const localOut = path.join(WORK_DIR, `${slug}_ep${epNum}_out.mp4`);

  try {
    // Re-mux: copy video, re-encode audio as mono AAC
    execSync(
      `ffmpeg -y -i "${videoUrl}" -c:v copy -c:a aac -ac 1 "${localOut}"`,
      { timeout: 120000, stdio: "pipe" }
    );

    if (!existsSync(localOut) || statSync(localOut).size < 1000) {
      return { slug, epNum, status: "error", reason: "output too small" };
    }

    // Determine the storage path from the videoUrl
    const urlObj = new URL(videoUrl);
    const storagePath = decodeURIComponent(
      urlObj.pathname.split("/o/")[1]
    );

    // Upload fixed file back to Firebase Storage
    await bucket.upload(localOut, {
      destination: storagePath,
      metadata: {
        contentType: "video/mp4",
        cacheControl: "public, max-age=86400",
      },
    });

    // Clean up
    if (existsSync(localIn)) unlinkSync(localIn);
    if (existsSync(localOut)) unlinkSync(localOut);

    return { slug, epNum, status: "success" };
  } catch (err) {
    if (existsSync(localIn)) unlinkSync(localIn);
    if (existsSync(localOut)) unlinkSync(localOut);
    return {
      slug,
      epNum,
      status: "error",
      reason: err.message?.substring(0, 120),
    };
  }
}

async function main() {
  console.log("=== ShortTV Audio Fix ===\n");

  const snapshot = await db
    .collection("videos")
    .where("status", "==", "published")
    .get();

  console.log(`Found ${snapshot.size} published videos\n`);

  let totalFixed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const docs = snapshot.docs;
  const totalBatches = Math.ceil(docs.length / CONCURRENCY);

  for (let i = 0; i < docs.length; i += CONCURRENCY) {
    const batch = docs.slice(i, i + CONCURRENCY);
    const batchNum = Math.floor(i / CONCURRENCY) + 1;

    const results = await Promise.all(
      batch.map(async (videoDoc) => {
        // Get first episode only (free, most likely to be played)
        const epSnap = await db
          .collection("videos")
          .doc(videoDoc.id)
          .collection("episodes")
          .orderBy("number", "asc")
          .limit(1)
          .get();

        if (epSnap.empty) {
          return [{ slug: videoDoc.data().slug, epNum: 0, status: "skipped", reason: "no episodes" }];
        }

        return Promise.all(
          epSnap.docs.map((epDoc) => fixEpisode(videoDoc, epDoc))
        );
      })
    );

    const flat = results.flat();
    const fixed = flat.filter((r) => r.status === "success").length;
    const skipped = flat.filter((r) => r.status === "skipped").length;
    const errors = flat.filter((r) => r.status === "error");

    totalFixed += fixed;
    totalSkipped += skipped;
    totalErrors += errors.length;

    console.log(
      `  Batch ${batchNum}/${totalBatches}: ${fixed} fixed, ${skipped} skipped, ${errors.length} errors`
    );
    for (const err of errors) {
      console.log(`    ERROR: ${err.slug} ep${err.epNum} — ${err.reason}`);
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`  Fixed: ${totalFixed}`);
  console.log(`  Skipped: ${totalSkipped}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  Total videos: ${snapshot.size}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
