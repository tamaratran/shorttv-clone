import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();
const COST_PER_EPISODE = 50;

export const addCoins = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  if (!request.auth.token.admin) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  const { amount, source = "purchase" } = request.data;

  if (!amount || typeof amount !== "number" || amount <= 0) {
    throw new HttpsError("invalid-argument", "amount must be a positive number");
  }

  const userRef = db.collection("users").doc(request.auth.uid);

  const newBalance = await db.runTransaction(async (tx) => {
    const userDoc = await tx.get(userRef);
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User profile not found");
    }

    const currentCoins = userDoc.data()?.coins || 0;
    const updated = currentCoins + amount;

    tx.update(userRef, {
      coins: updated,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.create(db.collection("coinTransactions").doc(), {
      userId: request.auth!.uid,
      type: "credit",
      amount,
      balanceAfter: updated,
      source,
      description: `Added ${amount} coins via ${source}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return updated;
  });

  return { success: true, balance: newBalance };
});

export const getBalance = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const userDoc = await db.collection("users").doc(request.auth.uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User profile not found");
  }

  const data = userDoc.data()!;
  return { coins: data.coins || 0, plan: data.plan || "free" };
});

export const unlockEpisode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const { videoId, episodeId } = request.data;

  if (!videoId || !episodeId) {
    throw new HttpsError("invalid-argument", "videoId and episodeId are required");
  }

  const userRef = db.collection("users").doc(request.auth.uid);
  const episodeRef = db
    .collection("videos")
    .doc(videoId)
    .collection("episodes")
    .doc(episodeId);

  const result = await db.runTransaction(async (tx) => {
    const [userDoc, episodeDoc] = await Promise.all([
      tx.get(userRef),
      tx.get(episodeRef),
    ]);

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User profile not found");
    }
    if (!episodeDoc.exists) {
      throw new HttpsError("not-found", "Episode not found");
    }

    const userData = userDoc.data()!;
    const episodeData = episodeDoc.data()!;

    // Premium users get free access
    if (userData.plan === "premium") {
      return { unlocked: true, coinsCost: 0, balance: userData.coins };
    }

    // Check if episode is free
    if (episodeData.isFree) {
      return { unlocked: true, coinsCost: 0, balance: userData.coins };
    }

    // Check if already unlocked
    const historyId = `${request.auth!.uid}_${videoId}_${episodeId}`;
    const historyDoc = await tx.get(db.collection("watchHistory").doc(historyId));
    if (historyDoc.exists && historyDoc.data()?.unlocked) {
      return { unlocked: true, coinsCost: 0, balance: userData.coins };
    }

    // Deduct coins
    const currentCoins = userData.coins || 0;
    if (currentCoins < COST_PER_EPISODE) {
      throw new HttpsError(
        "failed-precondition",
        `Not enough coins. Need ${COST_PER_EPISODE}, have ${currentCoins}`
      );
    }

    const newBalance = currentCoins - COST_PER_EPISODE;

    tx.update(userRef, {
      coins: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Record unlock in watch history
    const historyRef = db.collection("watchHistory").doc(historyId);
    tx.set(
      historyRef,
      {
        userId: request.auth!.uid,
        videoId,
        episodeId,
        progress: 0,
        duration: episodeData.duration || 0,
        completed: false,
        unlocked: true,
        lastWatchedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Record transaction
    tx.create(db.collection("coinTransactions").doc(), {
      userId: request.auth!.uid,
      type: "debit",
      amount: COST_PER_EPISODE,
      balanceAfter: newBalance,
      source: "episode_unlock",
      description: `Unlocked episode ${episodeData.number} of ${videoId}`,
      videoId,
      episodeId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { unlocked: true, coinsCost: COST_PER_EPISODE, balance: newBalance };
  });

  return result;
});

export const upgradePlan = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  if (!request.auth.token.admin) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  const userRef = db.collection("users").doc(request.auth.uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User profile not found");
  }

  if (userDoc.data()?.plan === "premium") {
    return { success: true, message: "Already on premium plan" };
  }

  await userRef.update({
    plan: "premium",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, message: "Upgraded to premium" };
});

export const downgradePlan = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  if (!request.auth.token.admin) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  const userRef = db.collection("users").doc(request.auth.uid);

  await userRef.update({
    plan: "free",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, message: "Downgraded to free plan" };
});

export const getCoinTransactions = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const { limit = 50 } = request.data || {};

  const snapshot = await db
    .collection("coinTransactions")
    .where("userId", "==", request.auth.uid)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});
