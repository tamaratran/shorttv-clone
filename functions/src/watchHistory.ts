import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const updateWatchProgress = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const { videoId, episodeId, progress, duration } = request.data;

  if (!videoId || !episodeId) {
    throw new HttpsError("invalid-argument", "videoId and episodeId are required");
  }

  if (typeof progress !== "number" || typeof duration !== "number") {
    throw new HttpsError("invalid-argument", "progress and duration must be numbers");
  }

  const historyId = `${request.auth.uid}_${videoId}_${episodeId}`;
  const completed = duration > 0 && progress >= duration * 0.9;

  await db
    .collection("watchHistory")
    .doc(historyId)
    .set(
      {
        userId: request.auth.uid,
        videoId,
        episodeId,
        progress,
        duration,
        completed,
        lastWatchedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  // Increment views on the video if this is the first watch
  const historyDoc = await db.collection("watchHistory").doc(historyId).get();
  const existingProgress = historyDoc.data()?.progress;
  if (existingProgress === undefined || existingProgress === 0) {
    await db
      .collection("videos")
      .doc(videoId)
      .update({
        views: admin.firestore.FieldValue.increment(1),
      });
  }

  return { success: true, completed };
});

export const getWatchHistory = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const { videoId, limit = 100 } = request.data || {};

  let query = db
    .collection("watchHistory")
    .where("userId", "==", request.auth.uid)
    .orderBy("lastWatchedAt", "desc");

  if (videoId) {
    query = query.where("videoId", "==", videoId);
  }

  const snapshot = await query.limit(limit).get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

export const getContinueWatching = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const snapshot = await db
    .collection("watchHistory")
    .where("userId", "==", request.auth.uid)
    .where("completed", "==", false)
    .orderBy("lastWatchedAt", "desc")
    .limit(20)
    .get();

  if (snapshot.empty) return [];

  const entries = snapshot.docs.map((doc) => doc.data());

  // Fetch associated video details
  const videoIds = [...new Set(entries.map((e) => e.videoId))];
  const videoDocs = await Promise.all(
    videoIds.map((id) => db.collection("videos").doc(id).get())
  );

  const videoMap: Record<string, admin.firestore.DocumentData> = {};
  for (const vDoc of videoDocs) {
    if (vDoc.exists) {
      videoMap[vDoc.id] = { id: vDoc.id, ...vDoc.data() };
    }
  }

  return entries.map((entry) => ({
    ...entry,
    video: videoMap[entry.videoId] || null,
  }));
});
