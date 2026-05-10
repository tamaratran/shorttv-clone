#!/usr/bin/env node

/**
 * Fix video streaming for Firebase Storage videos.
 *
 * Many uploaded videos have the moov atom at the end of the file,
 * which prevents browsers from streaming them properly. Chrome's decoder
 * shows green artifacts and fires PIPELINE_ERROR_DECODE because it
 * cannot locate keyframes until the entire file is downloaded.
 *
 * This script re-muxes each video with -movflags +faststart to move
 * the moov atom before the mdat atom, enabling progressive playback.
 * Video and audio streams are copied without re-encoding.
 *
 * Usage: GOOGLE_APPLICATION_CREDENTIALS=... node scripts/fix-video.mjs
 *
 * Options:
 *   --dry-run    Check videos without uploading fixes
 *   --all        Process all episodes (default: first episode only)
 */

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, unlinkSync, statSync } from "fs";
import path from "path";

const PROJECT_ID = "shorttv-videos";
const BUCKET_NAME = "shorttv-videos.firebasestorage.app";
const WORK_DIR = "/tmp/shorttv-video-fix";
const CONCURRENCY = 3;
const DRY_RUN = process.argv.includes("--dry-run");
const ALL_EPISODES = process.argv.includes("--all");

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
  try {
    const trace = execFileSync(
      "ffprobe",
      ["-v", "trace", videoUrl],
      { timeout: 30000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    // ffprobe writes trace output to stderr; combine both
    const atoms = [...trace.matchAll(/type:'(moov|mdat)'/g)].map((m) => m[1]);
    if (atoms.length < 2) return false;
    return atoms.indexOf("mdat") < atoms.indexOf("moov");
  } catch (err) {
    // execFileSync throws on non-zero exit; stderr is in err.stderr
    const stderr = err.stderr?.toString() || "";
    const atoms = [...stderr.matchAll(/type:'(moov|mdat)'/g)].map((m) => m[1]);
    if (atoms.length < 2) return false;
    return atoms.indexOf("mdat") < atoms.indexOf("moov");
  }
}

async function fixEpisode(videoDoc, episodeDoc) {
  const videoData = videoDoc.data();
  const epData = episodeDoc.data();
  const slug = videoData.slug;
  const epNum = epData.number;
  const videoUrl = epData.videoUrl;

  if (!videoUrl) return { slug, epNum, status: "skipped", reason: "no URL" };

  if (!needsFix(videoUrl)) {
    return { slug, epNum, status: "skipped", reason: "moov already first" };
  }

  if (DRY_RUN) {
    return { slug, epNum, status: "needs-fix", reason: "moov after mdat" };
  }

  const localOut = path.join(WORK_DIR, `${slug}_ep${epNum}_fixed.mp4`);

  try {
    // Re-mux: copy both streams, move moov atom to front
    execFileSync(
      "ffmpeg",
      ["-y", "-i", videoUrl, "-c", "copy", "-movflags", "+faststart", localOut],
      { timeout: 180000, stdio: "pipe" }
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
    if (existsSync(localOut)) unlinkSync(localOut);

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
  console.log("=== ShortTV Video Fix (faststart) ===");
  if (DRY_RUN) console.log("  (dry-run mode — no uploads)\n");
  else console.log();

  const snapshot = await db
    .collection("videos")
    .where("status", "==", "published")
    .get();

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
