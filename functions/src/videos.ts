import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const getVideos = onCall(async (request) => {
  const { limit = 20, startAfter, sortBy = "views" } = request.data || {};

  let query = db
    .collection("videos")
    .where("status", "==", "published")
    .orderBy(sortBy, "desc")
    .limit(limit);

  if (startAfter) {
    const startDoc = await db.collection("videos").doc(startAfter).get();
    if (startDoc.exists) {
      query = query.startAfter(startDoc);
    }
  }

  const snapshot = await query.get();
  const videos = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return { videos, hasMore: videos.length === limit };
});

export const getVideoBySlug = onCall(async (request) => {
  const { slug } = request.data;

  if (!slug) {
    throw new HttpsError("invalid-argument", "slug is required");
  }

  const snapshot = await db
    .collection("videos")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new HttpsError("not-found", "Video not found");
  }

  const doc = snapshot.docs[0];
  const videoData = { id: doc.id, ...doc.data() };

  // Fetch episodes
  const episodesSnap = await doc.ref
    .collection("episodes")
    .orderBy("number", "asc")
    .get();

  const episodes = episodesSnap.docs.map((ep) => ({
    id: ep.id,
    ...ep.data(),
  }));

  return { video: videoData, episodes };
});

export const getFeaturedVideos = onCall(async () => {
  const snapshot = await db
    .collection("videos")
    .where("status", "==", "published")
    .where("featured", "==", true)
    .orderBy("releaseDate", "desc")
    .limit(10)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

export const getVideosByGenre = onCall(async (request) => {
  const { genreId, limit = 20 } = request.data || {};

  if (!genreId) {
    throw new HttpsError("invalid-argument", "genreId is required");
  }

  const snapshot = await db
    .collection("videos")
    .where("status", "==", "published")
    .where("genreIds", "array-contains", genreId)
    .orderBy("views", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

export const searchVideos = onCall(async (request) => {
  const { query, limit = 20 } = request.data || {};

  if (!query || typeof query !== "string") {
    throw new HttpsError("invalid-argument", "query string is required");
  }

  // Simple prefix search on title
  const lowerQuery = query.toLowerCase();
  const snapshot = await db
    .collection("videos")
    .where("status", "==", "published")
    .orderBy("titleLower")
    .startAt(lowerQuery)
    .endAt(lowerQuery + "\uf8ff")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});
