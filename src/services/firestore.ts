import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";

// --- Video / Drama queries (direct Firestore reads — public) ---

export interface VideoDoc {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverUrl: string;
  bannerUrl: string;
  genreIds: string[];
  genres: string[];
  totalEpisodes: number;
  freeEpisodes: number;
  costPerEpisode: number;
  views: number;
  likes: number;
  rating: number;
  ratingCount: number;
  status: string;
  featured: boolean;
  storagePath?: string;
}

export interface EpisodeDoc {
  id: string;
  number: number;
  title: string;
  storagePath: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  isFree: boolean;
}

export interface GenreDoc {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  description: string;
  displayOrder: number;
  videoCount: number;
}

export async function fetchVideos(options?: {
  sortBy?: string;
  limitCount?: number;
  startAfterDoc?: QueryDocumentSnapshot<DocumentData>;
}): Promise<VideoDoc[]> {
  const { sortBy = "views", limitCount = 20, startAfterDoc } = options || {};

  let q = query(
    collection(db, "videos"),
    where("status", "==", "published"),
    orderBy(sortBy, "desc"),
    limit(limitCount)
  );

  if (startAfterDoc) {
    q = query(q, startAfter(startAfterDoc));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as VideoDoc);
}

export async function fetchFeaturedVideos(): Promise<VideoDoc[]> {
  const q = query(
    collection(db, "videos"),
    where("status", "==", "published"),
    where("featured", "==", true),
    orderBy("releaseDate", "desc"),
    limit(10)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as VideoDoc);
}

export async function fetchVideoBySlug(
  slug: string
): Promise<{ video: VideoDoc; episodes: EpisodeDoc[] } | null> {
  const q = query(
    collection(db, "videos"),
    where("slug", "==", slug),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const videoDoc = snapshot.docs[0];
  const video = { id: videoDoc.id, ...videoDoc.data() } as VideoDoc;

  const episodesSnap = await getDocs(
    query(collection(db, "videos", videoDoc.id, "episodes"), orderBy("number", "asc"))
  );
  const episodes = episodesSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as EpisodeDoc
  );

  return { video, episodes };
}

export async function fetchVideosByGenre(
  genreId: string,
  limitCount = 20
): Promise<VideoDoc[]> {
  const q = query(
    collection(db, "videos"),
    where("status", "==", "published"),
    where("genreIds", "array-contains", genreId),
    orderBy("views", "desc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as VideoDoc);
}

export async function fetchGenres(): Promise<GenreDoc[]> {
  const q = query(collection(db, "genres"), orderBy("displayOrder", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as GenreDoc);
}

export async function fetchVideoById(videoId: string): Promise<VideoDoc | null> {
  const docRef = doc(db, "videos", videoId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as VideoDoc;
}

export async function fetchEpisodes(videoId: string): Promise<EpisodeDoc[]> {
  const q = query(
    collection(db, "videos", videoId, "episodes"),
    orderBy("number", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as EpisodeDoc);
}

// --- Cloud Function calls (authenticated) ---

export function callFunction<T = unknown, R = unknown>(
  name: string
): (data: T) => Promise<R> {
  const fn = httpsCallable<T, R>(functions, name);
  return async (data: T) => {
    const result = await fn(data);
    return result.data;
  };
}

export const addCoins = callFunction<
  { amount: number; source?: string },
  { success: boolean; balance: number }
>("addCoins");

export const getBalance = callFunction<
  void,
  { coins: number; plan: string }
>("getBalance");

export const unlockEpisode = callFunction<
  { videoId: string; episodeId: string },
  { unlocked: boolean; coinsCost: number; balance: number }
>("unlockEpisode");

export const upgradePlan = callFunction<void, { success: boolean; message: string }>(
  "upgradePlan"
);

export const downgradePlan = callFunction<void, { success: boolean; message: string }>(
  "downgradePlan"
);

export const updateWatchProgress = callFunction<
  { videoId: string; episodeId: string; progress: number; duration: number },
  { success: boolean; completed: boolean }
>("updateWatchProgress");
