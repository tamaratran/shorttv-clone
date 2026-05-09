import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const createUserProfile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const email = request.auth.token.email || "";
  const { displayName } = request.data;

  const userRef = db.collection("users").doc(uid);
  const existing = await userRef.get();

  if (existing.exists) {
    return { success: true, message: "Profile already exists" };
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  await userRef.set({
    uid,
    email: email || "",
    displayName: displayName || "",
    avatarUrl: "",
    coins: 100, // welcome bonus
    plan: "free",
    favorites: [],
    createdAt: now,
    updatedAt: now,
  });

  return { success: true, message: "Profile created with 100 welcome coins" };
});

export const getUserProfile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const userRef = db.collection("users").doc(request.auth.uid);
  const doc = await userRef.get();

  if (!doc.exists) {
    throw new HttpsError("not-found", "User profile not found");
  }

  return doc.data();
});

export const updateUserProfile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const { displayName, avatarUrl, favorites } = request.data;
  const updates: Record<string, unknown> = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (displayName !== undefined) updates.displayName = displayName;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  if (favorites !== undefined) updates.favorites = favorites;

  await db.collection("users").doc(request.auth.uid).update(updates);

  return { success: true };
});
