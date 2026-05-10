import * as admin from "firebase-admin";

admin.initializeApp();

// User management
export {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
} from "./users";

// Video/drama management
export {
  getVideos,
  getVideoBySlug,
  getFeaturedVideos,
  getVideosByGenre,
  searchVideos,
} from "./videos";

// Genre management
export { getGenres } from "./genres";

// Subscription & coins
export {
  addCoins,
  getBalance,
  unlockEpisode,
  upgradePlan,
  downgradePlan,
  getCoinTransactions,
} from "./subscriptions";

// Watch history
export {
  updateWatchProgress,
  getWatchHistory,
  getContinueWatching,
} from "./watchHistory";

// Admin: seed data
export { seedGenres, seedVideoFromStorage } from "./admin";
