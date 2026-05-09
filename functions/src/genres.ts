import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const getGenres = onCall(async () => {
  const snapshot = await db
    .collection("genres")
    .orderBy("displayOrder", "asc")
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});
