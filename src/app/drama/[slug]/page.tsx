import Link from "next/link";
import { getDramaBySlug, getAllDramas } from "@/data/dramas";
import { notFound } from "next/navigation";
import { EpisodeGrid } from "@/components/EpisodeGrid";

export function generateStaticParams() {
  return getAllDramas().map((d) => ({ slug: d.slug }));
}

export default async function DramaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const drama = getDramaBySlug(slug);
  if (!drama) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="text-white">{drama.title}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-shrink-0 w-48 sm:w-56">
          <div className="aspect-[2/3] rounded-lg overflow-hidden bg-[#2a2a2a]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={drama.cover}
              alt={drama.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">
            {drama.title}
          </h1>

          <div className="flex items-center gap-6 text-sm text-gray-400 mb-4">
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
            <span>{drama.episodes} Episodes</span>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed mb-6">
            {drama.description}
          </p>

          <div className="flex flex-wrap gap-2 mb-8">
            {drama.genres.map((genre) => (
              <span
                key={genre}
                className="px-3 py-1 bg-white/10 rounded-full text-xs text-gray-300"
              >
                {genre}
              </span>
            ))}
          </div>

          <h2 className="text-lg font-bold mb-4">Episodes</h2>
          <EpisodeGrid
            slug={drama.slug}
            totalEpisodes={drama.episodes}
            freeEpisodes={drama.freeEpisodes}
          />
        </div>
      </div>
    </div>
  );
}
