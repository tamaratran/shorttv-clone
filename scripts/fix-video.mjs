#!/usr/bin/env node

/**
 * Re-encode Firebase Storage videos to fix Chrome decode errors.
 *
 * The original videos have corrupt I-frames and non-standard encoding that
 * causes Chrome's decoder to fail with PIPELINE_ERROR_DECODE around ~9s.
 * This script re-encodes to H.264 Main profile with proper keyframes.
 *
 * Usage: GOOGLE_APPLICATION_CREDENTIALS=... node scripts/fix-video.mjs [options]
 *
 * Options:
 *   --dry-run     Check videos without uploading fixes
 *   --limit N     Only process the first N videos
 *   --slug=X      Only process a specific drama by slug
 *   --force       Re-encode even if already processed (skip resume check)
 */

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { execFileSync, spawnSync } from "child_process";
import { existsSync, mkdirSync, unlinkSync, statSync, readFileSync, appendFileSync } from "fs";
import path from "path";

const PROJECT_ID = "shorttv-videos";
const BUCKET_NAME = "shorttv-videos.firebasestorage.app";
const WORK_DIR = "/tmp/shorttv-video-fix";
const CONCURRENCY = 3;

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const limitIdx = process.argv.indexOf("--limit");
const LIMIT = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1], 10) : Infinity;
const SLUG_FILTER = process.argv.find(a => a.startsWith("--slug="))?.split("=")[1] || null;

const DONE_LOG = path.join(WORK_DIR, "completed.log");

function loadDone() {
  if (!existsSync(DONE_LOG)) return new Set();
  return new Set(readFileSync(DONE_LOG, "utf-8").split("\n").filter(Boolean));
}
function markDone(key) {
  appendFileSync(DONE_LOG, key + "\n");
}

const app = initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
  storageBucket: BUCKET_NAME,
});

const db = getFirestore(app);
const bucket = getStorage(app).bucket();

if (!existsSync(WORK_DIR)) mkdirSync(WORK_DIR, { recursive: true });

function hasDecodeIssue(videoUrl) {
  const result = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_streams", "-print_format", "json", videoUrl],
    { timeout: 20000, encoding: "utf-8" }
  );
  try {
    const data = JSON.parse(result.stdout || "{}");
    const video = data.streams?.find((s) => s.codec_type === "video");
    if (!video) return false;
    return video.profile === "High" || parseInt(video.refs || "0", 10) < 2;
  } catch {
    return true;
  }
}

async function fixEpisode(videoDoc, episodeDoc) {
  const videoData = videoDoc.data();
  const epData = episodeDoc.data();
  const slug = videoData.slug;
  const epNum = epData.number;
  const videoUrl = epData.videoUrl;

  if (!videoUrl) return { slug, epNum, status: "skipped", reason: "no URL" };

  const doneKey = `${slug}_ep${epNum}`;
  if (!FORCE) {
    const doneSet = loadDone();
    if (doneSet.has(doneKey)) {
      return { slug, epNum, status: "skipped", reason: "already processed" };
    }
  }

  if (!hasDecodeIssue(videoUrl)) {
    return { slug, epNum, status: "skipped", reason: "already fixed" };
  }

  if (DRY_RUN) {
    return { slug, epNum, status: "dry-run", reason: "would re-encode" };
  }

  const safeName = `${slug.replace(/[^a-z0-9]/gi, "_")}_ep${epNum}`;
  const localOut = path.join(WORK_DIR, `${safeName}_out.mp4`);

  try {
    execFileSync("ffmpeg", [
      "-y", "-i", videoUrl,
      "-c:v", "libx264", "-profile:v", "main", "-level", "3.1",
      "-preset", "veryfast", "-crf", "23",
      "-g", "48", "-keyint_min", "24", "-sc_threshold", "40",
      "-c:a", "aac", "-b:a", "128k", "-ac", "1",
      "-movflags", "+faststart", localOut,
    ], { timeout: 600000, stdio: "pipe" });

    if (!existsSync(localOut) || statSync(localOut).size < 1000) {
      return { slug, epNum, status: "error", reason: "output too small" };
    }

    const urlObj = new URL(videoUrl);
    const storagePath = decodeURIComponent(
      urlObj.pathname.split("/o/")[1]
    );

    await bucket.upload(localOut, {
      destination: storagePath,
      metadata: {
        contentType: "video/mp4",
        cacheControl: "public, max-age=86400",
      },
    });

    const sizeMB = (statSync(localOut).size / 1024 / 1024).toFixed(1);
    if (existsSync(localOut)) unlinkSync(localOut);

    markDone(doneKey);
    return { slug, epNum, status: "success", sizeMB };
  } catch (err) {
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
  console.log("=== ShortTV Video Re-encode ===");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  if (LIMIT < Infinity) console.log(`Limit: ${LIMIT} videos`);
  if (SLUG_FILTER) console.log(`Filter: slug=${SLUG_FILTER}`);
  console.log();

  let query = db.collection("videos").where("status", "==", "published");
  if (SLUG_FILTER) query = query.where("slug", "==", SLUG_FILTER);
  const snapshot = await query.get();

  const docs = snapshot.docs.slice(0, LIMIT);
  console.log(`Processing ${docs.length} of ${snapshot.size} published videos\n`);

  let totalFixed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const totalBatches = Math.ceil(docs.length / CONCURRENCY);

  for (let i = 0; i < docs.length; i += CONCURRENCY) {
    const batch = docs.slice(i, i + CONCURRENCY);
    const batchNum = Math.floor(i / CONCURRENCY) + 1;

    const results = await Promise.all(
      batch.map(async (videoDoc) => {
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
    const dryRun = flat.filter((r) => r.status === "dry-run").length;

    totalFixed += fixed;
    totalSkipped += skipped;
    totalErrors += errors.length;

    if (DRY_RUN) {
      console.log(`  Batch ${batchNum}/${totalBatches}: ${dryRun} to fix, ${skipped} OK`);
    } else {
      console.log(`  Batch ${batchNum}/${totalBatches}: ${fixed} fixed, ${skipped} skipped, ${errors.length} errors`);
    }
    for (const r of flat.filter((r) => r.status === "success")) {
      console.log(`    OK: ${r.slug} ep${r.epNum} (${r.sizeMB}MB)`);
    }
    for (const err of errors) {
      console.log(`    ERROR: ${err.slug} ep${err.epNum} — ${err.reason}`);
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`  Fixed: ${totalFixed}`);
  console.log(`  Skipped: ${totalSkipped}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  Total: ${docs.length}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
