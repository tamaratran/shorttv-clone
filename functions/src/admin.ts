import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();
const bucket = admin.storage().bucket();

const GENRE_DATA = [
  { id: "new-release", name: "New Release", emoji: "\uD83C\uDD95", displayOrder: 1 },
  { id: "most-popular", name: "Most Popular", emoji: "\uD83D\uDD25", displayOrder: 2 },
  { id: "modern-romance", name: "Modern Romance", emoji: "\uD83D\uDC96", displayOrder: 3 },
  { id: "revenge", name: "Revenge", emoji: "\uD83D\uDDE1\uFE0F", displayOrder: 4 },
  { id: "ceo", name: "CEO", emoji: "\uD83D\uDC54", displayOrder: 5 },
  { id: "family", name: "Family", emoji: "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67", displayOrder: 6 },
  { id: "werewolf", name: "Werewolf", emoji: "\uD83D\uDC3A", displayOrder: 7 },
  { id: "immortal-fantasy", name: "Immortal Fantasy", emoji: "\u2728", displayOrder: 8 },
  { id: "apocalypse", name: "Apocalypse", emoji: "\uD83C\uDF2A\uFE0F", displayOrder: 9 },
  { id: "war-god", name: "War God", emoji: "\u2694\uFE0F", displayOrder: 10 },
  { id: "ancient-romance", name: "Ancient Romance", emoji: "\uD83C\uDFEF", displayOrder: 11 },
  { id: "horror-thriller", name: "Horror & Thriller", emoji: "\uD83D\uDC7B", displayOrder: 12 },
  { id: "mafia-romance", name: "Mafia Romance", emoji: "\uD83D\uDD2B", displayOrder: 13 },
  { id: "sports", name: "Sports", emoji: "\u26BD", displayOrder: 14 },
  { id: "elites", name: "Elites", emoji: "\uD83D\uDC51", displayOrder: 15 },
  { id: "tycoon-life", name: "Tycoon Life", emoji: "\uD83D\uDCB0", displayOrder: 16 },
  { id: "real-life", name: "Real Life", emoji: "\uD83C\uDFAC", displayOrder: 17 },
  { id: "fantasy", name: "Fantasy", emoji: "\uD83E\uDDD9", displayOrder: 18 },
  { id: "modern", name: "Modern", emoji: "\uD83C\uDFD9\uFE0F", displayOrder: 19 },
  { id: "urban-fantasy", name: "Urban Fantasy", emoji: "\uD83C\uDF03", displayOrder: 20 },
];

export const seedGenres = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }
  if (!request.auth.token.admin) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const genre of GENRE_DATA) {
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
  return { success: true, count: GENRE_DATA.length };
});

export const seedVideoFromStorage = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }
  if (!request.auth.token.admin) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  const { folderName, title, slug, genres, genreIds, featured = false } =
    request.data || {};

  if (!folderName || !title || !slug) {
    throw new HttpsError(
      "invalid-argument",
      "folderName, title, and slug are required"
    );
  }

  // List episode files from Storage
  const [files] = await bucket.getFiles({ prefix: `${folderName}/` });
  const episodeFiles = files
    .filter((f) => f.name.endsWith(".mp4"))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (episodeFiles.length === 0) {
    throw new HttpsError("not-found", `No .mp4 files found in ${folderName}/`);
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const videoId = slug;

  // Create the video (drama) document
  const videoRef = db.collection("videos").doc(videoId);
  await videoRef.set({
    id: videoId,
    title,
    slug,
    titleLower: title.toLowerCase(),
    description: `Watch ${title} — ${episodeFiles.length} episodes available.`,
    coverUrl: "",
    bannerUrl: "",
    genreIds: genreIds || [],
    genres: genres || [],
    totalEpisodes: episodeFiles.length,
    freeEpisodes: Math.min(4, episodeFiles.length),
    costPerEpisode: 50,
    views: 0,
    likes: 0,
    rating: 0,
    ratingCount: 0,
    status: "published",
    featured,
    storagePath: folderName,
    releaseDate: now,
    createdAt: now,
    updatedAt: now,
  });

  // Create episode subcollection documents
  const batch = db.batch();
  for (let i = 0; i < episodeFiles.length; i++) {
    const file = episodeFiles[i];
    const episodeNum = i + 1;
    const episodeId = `ep_${String(episodeNum).padStart(3, "0")}`;

    batch.set(videoRef.collection("episodes").doc(episodeId), {
      id: episodeId,
      number: episodeNum,
      title: `Episode ${episodeNum}`,
      storagePath: file.name,
      videoUrl: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media`,
      thumbnailUrl: "",
      duration: 0,
      isFree: episodeNum <= Math.min(4, episodeFiles.length),
      createdAt: now,
    });
  }

  await batch.commit();

  return {
    success: true,
    videoId,
    episodesCreated: episodeFiles.length,
  };
});
