"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchGenres,
  fetchVideosByGenre,
  type VideoDoc,
  type GenreDoc,
} from "@/services/firestore";

interface GenreSection {
  genre: GenreDoc;
  dramas: VideoDoc[];
}

export default function DramasPage() {
  const [sections, setSections] = useState<GenreSection[]>([]);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const genres = await fetchGenres();
        const results = await Promise.all(
          genres.map(async (genre) => {
            const dramas = await fetchVideosByGenre(genre.id, 20);
            return { genre, dramas };
          })
        );
        const genreSections: GenreSection[] = results
          .filter((r) => r.dramas.length > 0)
          .map((r) => ({ genre: r.genre, dramas: r.dramas }));

        setSections(genreSections);
      } catch (err) {
        console.error("Failed to load dramas by genre:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white" />
      </div>
    );
  }

  const filtered = activeGenre
    ? sections.filter((s) => s.genre.id === activeGenre)
    : sections;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="text-white">All Dramas</span>
      </div>

      <h1 className="text-[26px] sm:text-3xl font-bold mb-6">All Dramas</h1>

      {/* Genre filter pills */}
      <div className="flex flex-wrap gap-2.5 mb-8">
        <button
          onClick={() => setActiveGenre(null)}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            activeGenre === null
              ? "bg-[#F6610F] text-white"
              : "bg-[#2a2a2e] border border-white/10 text-gray-200 hover:bg-[#3a3a3e]"
          }`}
        >
          All
        </button>
        {sections.map((s) => (
          <button
            key={s.genre.id}
            onClick={() =>
              setActiveGenre(s.genre.id === activeGenre ? null : s.genre.id)
            }
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              activeGenre === s.genre.id
                ? "bg-[#F6610F] text-white"
                : "bg-[#2a2a2e] border border-white/10 text-gray-200 hover:bg-[#3a3a3e]"
            }`}
          >
            {s.genre.emoji} {s.genre.name}
          </button>
        ))}
      </div>

      {/* Genre sections */}
      <div className="space-y-10">
        {filtered.map((section) => (
          <section key={section.genre.id}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>{section.genre.emoji}</span>
              {section.genre.name}
              <span className="text-sm font-normal text-gray-400">
                ({section.dramas.length})
              </span>
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
              {section.dramas.map((drama) => (
                <div key={drama.id}>
                  <Link
                    href={`/episode/${drama.slug}`}
                    className="block group"
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#2a2a2a]">
                      <Image
                        src={
                          drama.coverUrl ||
                          `https://picsum.photos/seed/${drama.slug}/300/450`
                        }
                        alt={drama.title}
                        fill
                        sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </Link>
                  <Link
                    href={`/drama/${drama.slug}`}
                    className="block mt-2 text-[13px] text-white/90 hover:text-white line-clamp-2 leading-snug transition-colors"
                  >
                    {drama.title}
                  </Link>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
