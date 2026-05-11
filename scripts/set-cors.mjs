import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucket = storage.bucket('shorttv-videos.firebasestorage.app');

const corsConfig = [
  {
    origin: ['*'],
    method: ['GET'],
    maxAgeSeconds: 3600,
    responseHeader: ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges'],
  },
];

try {
  await bucket.setCorsConfiguration(corsConfig);
  console.log('CORS configuration set successfully!');
  
  // Verify
  const [metadata] = await bucket.getMetadata();
  console.log('Current CORS config:', JSON.stringify(metadata.cors, null, 2));
} catch (err) {
  console.error('Error setting CORS:', err.message);
}
