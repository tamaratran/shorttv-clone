"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, use } from "react";
import {
  fetchVideoBySlug,
  type VideoDoc,
  type EpisodeDoc,
} from "@/services/firestore";
import { formatViews } from "@/lib/format";
import { VideoPlayer } from "@/components/VideoPlayer";
import { EpisodeGrid } from "@/components/EpisodeGrid";
import { useSearchParams } from "next/navigation";

export default function EpisodePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white" />
        </div>
      }
    >
      <EpisodeContent params={params} />
    </Suspense>
  );
}

function EpisodeContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const ep = searchParams.get("ep");
  const episodeNum = ep ? parseInt(ep, 10) : 1;

  const [video, setVideo] = useState<VideoDoc | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideoBySlug(slug)
      .then((result) => {
        if (result) {
          setVideo(result.video);
          setEpisodes(result.episodes);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-gray-400">Drama not found.</p>
      </div>
    );
  }

  const currentEpisode = episodes.find((e) => e.number === episodeNum);
  const locked = episodeNum > video.freeEpisodes;
  const videoUrl = currentEpisode?.videoUrl;
  const cover =
    video.coverUrl || `https://picsum.photos/seed/${video.slug}/300/450`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link
          href={`/drama/${video.slug}`}
          className="hover:text-white transition-colors"
        >
          {video.title}
        </Link>
        <span>/</span>
        <span className="text-white">Episode {episodeNum}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:flex-1">
          <VideoPlayer
            dramaTitle={video.title}
            episode={episodeNum}
            locked={locked}
            cover={cover}
            slug={video.slug}
            totalEpisodes={video.totalEpisodes}
            videoUrl={videoUrl}
          />
        </div>

        <div className="lg:w-80 xl:w-96">
          <h1 className="text-xl sm:text-2xl font-bold mb-2">
            {video.title} - Episode {episodeNum}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              {formatViews(video.views)}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              {formatViews(video.likes)}
            </span>
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              {video.rating.toFixed(1)}
            </span>
          </div>

          <p className="text-gray-400 text-sm mb-2">
            Plot of Episode {episodeNum}
          </p>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            {video.description}
          </p>

          <div className="flex flex-wrap gap-2 mb-6">
            {video.genres.map((genre) => (
              <span
                key={genre}
                className="px-3 py-1 bg-white/10 rounded-full text-xs text-gray-300"
              >
                {genre}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">
              1-{Math.min(50, video.totalEpisodes)}
            </span>
            <Link
              href={`/drama/${video.slug}`}
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
            >
              All Episodes
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>

          <EpisodeGrid
            slug={video.slug}
            totalEpisodes={video.totalEpisodes}
            freeEpisodes={video.freeEpisodes}
            currentEpisode={episodeNum}
            maxDisplay={50}
            columns="grid-cols-5"
          />
        </div>
      </div>
    </div>
  );
}
