#!/usr/bin/env node

/**
 * Generate cover images from episode videos and upload to Firebase Storage.
 * Extracts a frame at t=3s from each drama's first episode using FFmpeg,
 * uploads the JPEG to Storage, and updates the Firestore video document.
 *
 * Usage: GOOGLE_APPLICATION_CREDENTIALS=... node scripts/generate-covers.mjs
 */

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { execSync } from "child_process";
import { existsSync, mkdirSync, unlinkSync, statSync } from "fs";
import path from "path";

const PROJECT_ID = "shorttv-videos";
const BUCKET_NAME = "shorttv-videos.firebasestorage.app";
const THUMB_DIR = "/tmp/shorttv-covers";
const CONCURRENCY = 5;
const SEEK_TIME = 3; // seconds into video to extract frame

const app = initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
  storageBucket: BUCKET_NAME,
});

const db = getFirestore(app);
const bucket = getStorage(app).bucket();

if (!existsSync(THUMB_DIR)) mkdirSync(THUMB_DIR, { recursive: true });

function publicUrl(storagePath) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(storagePath)}?alt=media`;
}

async function extractAndUploadCover(videoDoc) {
  const data = videoDoc.data();
  const slug = data.slug;

  // Skip if already has a real cover
  if (data.coverUrl && !data.coverUrl.includes("picsum")) {
    return { slug, status: "skipped", reason: "already has cover" };
  }

  // Get first episode
  const epSnap = await db
    .collection("videos")
    .doc(videoDoc.id)
    .collection("episodes")
    .orderBy("number", "asc")
    .limit(1)
    .get();

  if (epSnap.empty) {
    return { slug, status: "skipped", reason: "no episodes" };
  }

  const ep = epSnap.docs[0].data();
  const videoUrl = ep.videoUrl;

  if (!videoUrl) {
    return { slug, status: "skipped", reason: "no videoUrl" };
  }

  const localPath = path.join(THUMB_DIR, `${slug}.jpg`);
  const storagePath = `covers/${slug}.jpg`;

  try {
    // Extract frame with FFmpeg — seek first (-ss before -i) for speed
    execSync(
      `ffmpeg -ss ${SEEK_TIME} -i "${videoUrl}" -frames:v 1 -q:v 2 -vf "scale=480:-2" "${localPath}" -y`,
      { timeout: 30000, stdio: "pipe" }
    );

    // Verify file was created and has content
    if (!existsSync(localPath) || statSync(localPath).size < 1000) {
      return { slug, status: "error", reason: "thumbnail too small or missing" };
    }

    // Upload to Firebase Storage
    await bucket.upload(localPath, {
      destination: storagePath,
      metadata: {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=31536000",
      },
    });

    // Get the public URL
    const coverUrl = publicUrl(storagePath);

    // Update Firestore document
    await db.collection("videos").doc(videoDoc.id).update({
      coverUrl,
      bannerUrl: coverUrl, // use same image for banner
    });

    // Clean up local file
    unlinkSync(localPath);

    return { slug, status: "success", coverUrl };
  } catch (err) {
    // Clean up on error
    if (existsSync(localPath)) unlinkSync(localPath);
    return { slug, status: "error", reason: err.message?.substring(0, 100) };
  }
}

async function processBatch(docs, batchNum, totalBatches) {
  const results = await Promise.all(docs.map(extractAndUploadCover));
  const success = results.filter((r) => r.status === "success").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error");

  console.log(
    `  Batch ${batchNum}/${totalBatches}: ${success} success, ${skipped} skipped, ${errors.length} errors`
  );
  for (const err of errors) {
    console.log(`    ERROR: ${err.slug} — ${err.reason}`);
  }
  return results;
}

async function main() {
  console.log("=== ShortTV Cover Image Generator ===\n");

  // Get all published videos
  const snapshot = await db
    .collection("videos")
    .where("status", "==", "published")
    .get();

  console.log(`Found ${snapshot.size} published videos\n`);

  const docs = snapshot.docs;
  const totalBatches = Math.ceil(docs.length / CONCURRENCY);
  let totalSuccess = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (let i = 0; i < docs.length; i += CONCURRENCY) {
    const batch = docs.slice(i, i + CONCURRENCY);
    const batchNum = Math.floor(i / CONCURRENCY) + 1;
    const results = await processBatch(batch, batchNum, totalBatches);
    totalSuccess += results.filter((r) => r.status === "success").length;
    totalSkipped += results.filter((r) => r.status === "skipped").length;
    totalErrors += results.filter((r) => r.status === "error").length;
  }

  console.log(`\n=== Complete ===`);
  console.log(`  Success: ${totalSuccess}`);
  console.log(`  Skipped: ${totalSkipped}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  Total: ${snapshot.size}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
