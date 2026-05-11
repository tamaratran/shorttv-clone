#!/usr/bin/env node

/**
 * Fix video streaming for Firebase Storage videos.
 *
 * Many uploaded videos have corrupt frames that cause green pixelation
 * and PIPELINE_ERROR_DECODE in browsers. This script can either:
 *   1. Re-mux: move moov atom before mdat (fast, no re-encoding)
 *   2. Re-encode: fully re-encode with H.264/AAC to fix corrupt frames
 *
 * Usage: GOOGLE_APPLICATION_CREDENTIALS=... node scripts/fix-video.mjs
 *
 * Options:
 *   --dry-run    Check videos without uploading fixes
 *   --all        Process all episodes (default: first episode only)
 *   --reencode   Re-encode videos with libx264/aac (fixes green artifacts)
 *   --slug=X     Only process a specific drama by slug
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
const ALL_EPISODES = process.argv.includes("--all");
const REENCODE = process.argv.includes("--reencode");
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

/**
 * Check whether the moov atom comes after mdat (needs fixing).
 */
function needsFix(videoUrl) {
  const result = spawnSync(
    "ffprobe",
    ["-v", "trace", videoUrl],
    { timeout: 30000, encoding: "utf-8" }
  );
  // ffprobe writes trace output to stderr
  const output = (result.stdout || "") + (result.stderr || "");
  const atoms = [...output.matchAll(/type:'(moov|mdat)'/g)].map((m) => m[1]);
  if (atoms.length < 2) return false;
  return atoms.indexOf("mdat") < atoms.indexOf("moov");
}

async function fixEpisode(videoDoc, episodeDoc) {
  const videoData = videoDoc.data();
  const epData = episodeDoc.data();
  const slug = videoData.slug;
  const epNum = epData.number;
  const videoUrl = epData.videoUrl;

  if (!videoUrl) return { slug, epNum, status: "skipped", reason: "no URL" };

  const doneKey = `${slug}_ep${epNum}`;
  const doneSet = loadDone();
  if (doneSet.has(doneKey)) {
    return { slug, epNum, status: "skipped", reason: "already processed" };
  }

  if (!REENCODE && !needsFix(videoUrl)) {
    return { slug, epNum, status: "skipped", reason: "moov already first" };
  }

  if (DRY_RUN) {
    return { slug, epNum, status: "needs-fix", reason: "moov after mdat" };
  }

  const localOut = path.join(WORK_DIR, `${slug}_ep${epNum}_fixed.mp4`);

  try {
    const ffmpegArgs = REENCODE
      ? ["-y", "-i", videoUrl, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
         "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", localOut]
      : ["-y", "-i", videoUrl, "-c", "copy", "-movflags", "+faststart", localOut];

    // Re-encode timeout is much longer (10 min vs 3 min)
    const timeout = REENCODE ? 600000 : 180000;
    execFileSync("ffmpeg", ffmpegArgs, { timeout, stdio: "pipe" });

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
    if (existsSync(localOut)) unlinkSync(localOut);

    markDone(doneKey);
    return { slug, epNum, status: "success" };
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
  console.log(`=== ShortTV Video Fix (${REENCODE ? "re-encode" : "faststart"}) ===`);
  if (DRY_RUN) console.log("  (dry-run mode — no uploads)");
  if (REENCODE) console.log("  (re-encode mode — full H.264/AAC re-encoding)");
  if (SLUG_FILTER) console.log(`  (filtering to slug: ${SLUG_FILTER})`);
  console.log();

  let query = db.collection("videos").where("status", "==", "published");
  if (SLUG_FILTER) query = query.where("slug", "==", SLUG_FILTER);
  const snapshot = await query.get();

  console.log(`Found ${snapshot.size} published videos\n`);

  let totalFixed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let totalNeedsFix = 0;
  const docs = snapshot.docs;
  const totalBatches = Math.ceil(docs.length / CONCURRENCY);

  for (let i = 0; i < docs.length; i += CONCURRENCY) {
    const batch = docs.slice(i, i + CONCURRENCY);
    const batchNum = Math.floor(i / CONCURRENCY) + 1;

    const results = await Promise.all(
      batch.map(async (videoDoc) => {
        const epQuery = db
          .collection("videos")
          .doc(videoDoc.id)
          .collection("episodes")
          .orderBy("number", "asc");

        const epSnap = ALL_EPISODES
          ? await epQuery.get()
          : await epQuery.limit(1).get();

        if (epSnap.empty) {
          return [
            {
              slug: videoDoc.data().slug,
              epNum: 0,
              status: "skipped",
              reason: "no episodes",
            },
          ];
        }

        return Promise.all(
          epSnap.docs.map((epDoc) => fixEpisode(videoDoc, epDoc))
        );
      })
    );

    const flat = results.flat();
    const fixed = flat.filter((r) => r.status === "success").length;
    const skipped = flat.filter((r) => r.status === "skipped").length;
    const needsFix = flat.filter((r) => r.status === "needs-fix").length;
    const errors = flat.filter((r) => r.status === "error");

    totalFixed += fixed;
    totalSkipped += skipped;
    totalNeedsFix += needsFix;
    totalErrors += errors.length;

    console.log(
      `  Batch ${batchNum}/${totalBatches}: ${fixed} fixed, ${needsFix} needs-fix, ${skipped} skipped, ${errors.length} errors`
    );
    for (const err of errors) {
      console.log(`    ERROR: ${err.slug} ep${err.epNum} — ${err.reason}`);
    }
    for (const nf of flat.filter((r) => r.status === "needs-fix")) {
      console.log(`    NEEDS FIX: ${nf.slug} ep${nf.epNum}`);
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`  Fixed: ${totalFixed}`);
  if (DRY_RUN) console.log(`  Needs fix: ${totalNeedsFix}`);
  console.log(`  Skipped: ${totalSkipped}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  Total videos: ${snapshot.size}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
