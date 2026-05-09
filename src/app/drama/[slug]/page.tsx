import Link from "next/link";
import { getDramaBySlug, getAllDramas } from "@/data/dramas";
import { notFound } from "next/navigation";

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
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {Array.from({ length: drama.episodes }, (_, i) => {
              const epNum = i + 1;
              const locked = epNum > drama.freeEpisodes;
              return (
                <Link
                  key={epNum}
                  href={`/episode/${drama.slug}?ep=${epNum}`}
                  className={`relative flex items-center justify-center h-10 rounded text-sm font-medium transition-colors ${
                    locked
                      ? "bg-white/5 text-gray-500 hover:bg-white/10"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {epNum}
                  {locked && (
                    <svg
                      className="absolute top-0.5 right-0.5 w-2.5 h-2.5 text-yellow-500"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                    </svg>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
