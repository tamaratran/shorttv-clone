import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getStorage,
  ref,
  getDownloadURL,
  uploadBytes,
  listAll,
  type StorageReference,
  type FirebaseStorage,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const storage: FirebaseStorage = getStorage(app);

export { app, storage };

export function getStorageRef(path: string): StorageReference {
  return ref(storage, path);
}

export async function getFileURL(path: string): Promise<string> {
  const fileRef = ref(storage, path);
  return getDownloadURL(fileRef);
}

export async function uploadFile(
  path: string,
  file: File | Blob | Uint8Array
): Promise<string> {
  const fileRef = ref(storage, path);
  const snapshot = await uploadBytes(fileRef, file);
  return getDownloadURL(snapshot.ref);
}

export async function listFiles(path: string): Promise<StorageReference[]> {
  const dirRef = ref(storage, path);
  const result = await listAll(dirRef);
  return result.items;
}
