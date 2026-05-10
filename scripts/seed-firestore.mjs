#!/usr/bin/env node

/**
 * Seed Firestore with genres and video metadata from Firebase Storage.
 * Reads all drama folders from the storage bucket and creates Firestore documents.
 *
 * Usage: node scripts/seed-firestore.mjs
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or firebase login
 */

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const PROJECT_ID = "shorttv-videos";
const BUCKET = "shorttv-videos.firebasestorage.app";

const app = initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
  storageBucket: BUCKET,
});

const db = getFirestore(app);
const bucket = getStorage(app).bucket();

// --- Genres ---
const GENRES = [
  { id: "new-release", name: "New Release", emoji: "\uD83C\uDD95", displayOrder: 1 },
  { id: "most-popular", name: "Most Popular", emoji: "\uD83D\uDD25", displayOrder: 2 },
  { id: "modern-romance", name: "Modern Romance", emoji: "\uD83D\uDC96", displayOrder: 3 },
  { id: "revenge", name: "Revenge", emoji: "\uD83D\uDDE1\uFE0F", displayOrder: 4 },
  { id: "ceo", name: "CEO", emoji: "\uD83D\uDC54", displayOrder: 5 },
  { id: "family", name: "Family", emoji: "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67", displayOrder: 6 },
  { id: "werewolf", name: "Werewolf", emoji: "\uD83D\uDC3A", displayOrder: 7 },
  { id: "fantasy", name: "Fantasy", emoji: "\u2728", displayOrder: 8 },
  { id: "apocalypse", name: "Apocalypse", emoji: "\uD83C\uDF2A\uFE0F", displayOrder: 9 },
  { id: "action", name: "Action", emoji: "\u2694\uFE0F", displayOrder: 10 },
  { id: "historical", name: "Historical", emoji: "\uD83C\uDFEF", displayOrder: 11 },
  { id: "horror-thriller", name: "Horror & Thriller", emoji: "\uD83D\uDC7B", displayOrder: 12 },
  { id: "crime", name: "Crime", emoji: "\uD83D\uDD2B", displayOrder: 13 },
  { id: "drama", name: "Drama", emoji: "\uD83C\uDFAD", displayOrder: 14 },
  { id: "comedy", name: "Comedy", emoji: "\uD83D\uDE02", displayOrder: 15 },
  { id: "suspense", name: "Suspense", emoji: "\uD83D\uDD0D", displayOrder: 16 },
];

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function inferGenres(title) {
  const t = title.toLowerCase();
  const genres = [];
  const genreIds = [];

  const rules = [
    { keywords: ["love", "romance", "heart", "kiss", "bride", "wedding", "wife", "husband", "marriage"], genre: "Modern Romance", id: "modern-romance" },
    { keywords: ["revenge", "betray", "regret", "forsake", "destroy", "payback"], genre: "Revenge", id: "revenge" },
    { keywords: ["ceo", "boss", "billionaire", "tycoon", "rich", "heir", "heiress"], genre: "CEO", id: "ceo" },
    { keywords: ["baby", "child", "daughter", "son", "mom", "dad", "family", "mother", "father", "twin"], genre: "Family", id: "family" },
    { keywords: ["wolf", "werewolf", "alpha", "luna", "pack", "mate", "lycan"], genre: "Werewolf", id: "werewolf" },
    { keywords: ["dragon", "magic", "immortal", "god", "goddess", "olympus", "phoenix", "fairy", "enchant"], genre: "Fantasy", id: "fantasy" },
    { keywords: ["zombie", "apocalypse", "doomsday", "undead", "survive", "wasteland"], genre: "Apocalypse", id: "apocalypse" },
    { keywords: ["fight", "warrior", "battle", "martial", "combat", "assassin", "soldier"], genre: "Action", id: "action" },
    { keywords: ["ancient", "dynasty", "emperor", "empress", "kingdom", "prince", "princess", "throne", "palace"], genre: "Historical", id: "historical" },
    { keywords: ["ghost", "horror", "scary", "dark", "nightmare", "haunted", "curse"], genre: "Horror & Thriller", id: "horror-thriller" },
    { keywords: ["mafia", "gang", "crime", "detective", "murder", "prison"], genre: "Crime", id: "crime" },
    { keywords: ["funny", "comedy", "laugh", "hilarious"], genre: "Comedy", id: "comedy" },
    { keywords: ["secret", "mystery", "suspense", "hidden", "reveal", "truth"], genre: "Suspense", id: "suspense" },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => t.includes(kw))) {
      if (!genres.includes(rule.genre)) {
        genres.push(rule.genre);
        genreIds.push(rule.id);
      }
    }
  }

  // Fallback genre
  if (genres.length === 0) {
    genres.push("Drama");
    genreIds.push("drama");
  }

  return { genres, genreIds };
}

async function seedGenres() {
  console.log("Seeding genres...");
  const batch = db.batch();
  const now = FieldValue.serverTimestamp();

  for (const genre of GENRES) {
    const ref = db.collection("genres").doc(genre.id);
    batch.set(ref, {
      ...genre,
      slug: genre.id,
      description: `${genre.name} dramas`,
      videoCount: 0,
      createdAt: now,
    });
  }

  await batch.commit();
  console.log(`  Seeded ${GENRES.length} genres`);
}

async function listDramaFolders() {
  console.log("Listing drama folders in storage...");
  const [files] = await bucket.getFiles({ delimiter: "/" });
  const [, , apiResponse] = await bucket.getFiles({ delimiter: "/", autoPaginate: false });

  // Get folder prefixes
  const prefixes = apiResponse?.prefixes || [];
  console.log(`  Found ${prefixes.length} folders`);
  return prefixes.map((p) => p.replace(/\/$/, ""));
}

async function seedVideo(folderName, index, total) {
  const slug = slugify(folderName);
  const videoId = slug;

  // Check if already exists
  const existing = await db.collection("videos").doc(videoId).get();
  if (existing.exists) {
    console.log(`  [${index}/${total}] Skipping "${folderName}" (already exists)`);
    return;
  }

  // List episode files
  const [files] = await bucket.getFiles({ prefix: `${folderName}/` });
  const episodeFiles = files
    .filter((f) => f.name.endsWith(".mp4"))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (episodeFiles.length === 0) {
    console.log(`  [${index}/${total}] Skipping "${folderName}" (no .mp4 files)`);
    return;
  }

  const { genres, genreIds } = inferGenres(folderName);
  const now = FieldValue.serverTimestamp();
  const isFeatured = index <= 6;

  // Create video document
  const videoRef = db.collection("videos").doc(videoId);
  await videoRef.set({
    id: videoId,
    title: folderName,
    slug,
    titleLower: folderName.toLowerCase(),
    description: `Watch ${folderName} — ${episodeFiles.length} episodes available.`,
    coverUrl: "",
    bannerUrl: "",
    genreIds,
    genres,
    totalEpisodes: episodeFiles.length,
    freeEpisodes: Math.min(4, episodeFiles.length),
    costPerEpisode: 50,
    views: Math.floor(Math.random() * 500000) + 10000,
    likes: Math.floor(Math.random() * 100000) + 5000,
    rating: parseFloat((Math.random() * 2 + 7.5).toFixed(1)),
    ratingCount: Math.floor(Math.random() * 5000) + 100,
    status: "published",
    featured: isFeatured,
    storagePath: folderName,
    releaseDate: now,
    createdAt: now,
    updatedAt: now,
  });

  // Create episodes (batch writes in groups of 500)
  const BATCH_SIZE = 400;
  for (let batchStart = 0; batchStart < episodeFiles.length; batchStart += BATCH_SIZE) {
    const batch = db.batch();
    const batchEnd = Math.min(batchStart + BATCH_SIZE, episodeFiles.length);

    for (let i = batchStart; i < batchEnd; i++) {
      const file = episodeFiles[i];
      const episodeNum = i + 1;
      const episodeId = `ep_${String(episodeNum).padStart(3, "0")}`;

      batch.set(videoRef.collection("episodes").doc(episodeId), {
        id: episodeId,
        number: episodeNum,
        title: `Episode ${episodeNum}`,
        storagePath: file.name,
        videoUrl: `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(file.name)}?alt=media`,
        thumbnailUrl: "",
        duration: 0,
        isFree: episodeNum <= Math.min(4, episodeFiles.length),
        createdAt: now,
      });
    }

    await batch.commit();
  }

  console.log(
    `  [${index}/${total}] Seeded "${folderName}" — ${episodeFiles.length} episodes, genres: [${genres.join(", ")}]`
  );
}

async function updateGenreCounts() {
  console.log("Updating genre video counts...");
  for (const genre of GENRES) {
    const snapshot = await db
      .collection("videos")
      .where("genreIds", "array-contains", genre.id)
      .where("status", "==", "published")
      .get();

    await db.collection("genres").doc(genre.id).update({
      videoCount: snapshot.size,
    });
    if (snapshot.size > 0) {
      console.log(`  ${genre.name}: ${snapshot.size} videos`);
    }
  }
}

async function main() {
  console.log("=== ShortTV Firestore Seed Script ===\n");

  await seedGenres();

  const folders = await listDramaFolders();
  console.log(`\nSeeding ${folders.length} dramas from storage...\n`);

  for (let i = 0; i < folders.length; i++) {
    await seedVideo(folders[i], i + 1, folders.length);
  }

  await updateGenreCounts();

  console.log("\n=== Seed complete! ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
