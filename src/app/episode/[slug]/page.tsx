import Link from "next/link";
import { getDramaBySlug, getAllDramas } from "@/data/dramas";
import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/VideoPlayer";
import { EpisodeGrid } from "@/components/EpisodeGrid";

export function generateStaticParams() {
  return getAllDramas().map((d) => ({ slug: d.slug }));
}

export default async function EpisodePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ep?: string }>;
}) {
  const { slug } = await params;
  const { ep } = await searchParams;
  const drama = getDramaBySlug(slug);
  if (!drama) notFound();

  const episodeNum = ep ? parseInt(ep, 10) : 1;
  const locked = episodeNum > drama.freeEpisodes;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link
          href={`/drama/${drama.slug}`}
          className="hover:text-white transition-colors"
        >
          {drama.title}
        </Link>
        <span>/</span>
        <span className="text-white">Episode {episodeNum}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:flex-1">
          <VideoPlayer
            dramaTitle={drama.title}
            episode={episodeNum}
            locked={locked}
            cover={drama.cover}
            slug={drama.slug}
            totalEpisodes={drama.episodes}
          />
        </div>

        <div className="lg:w-80 xl:w-96">
          <h1 className="text-xl sm:text-2xl font-bold mb-2">
            {drama.title} - Episode {episodeNum}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              {drama.views}
            </span>
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              {drama.likes}
            </span>
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              {drama.rating}
            </span>
          </div>

          <p className="text-gray-400 text-sm mb-2">
            Plot of Episode {episodeNum}
          </p>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            {drama.description}
          </p>

          <div className="flex flex-wrap gap-2 mb-6">
            {drama.genres.map((genre) => (
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
              1-{Math.min(50, drama.episodes)}
            </span>
            <Link
              href={`/drama/${drama.slug}`}
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
            slug={drama.slug}
            totalEpisodes={drama.episodes}
            freeEpisodes={drama.freeEpisodes}
            currentEpisode={episodeNum}
            maxDisplay={50}
            columns="grid-cols-5"
          />
        </div>
      </div>
    </div>
  );
}
