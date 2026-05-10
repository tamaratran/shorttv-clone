"use client";

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
        const genreSections: GenreSection[] = [];

        for (const genre of genres) {
          const dramas = await fetchVideosByGenre(genre.id, 20);
          if (dramas.length > 0) {
            genreSections.push({ genre, dramas });
          }
        }

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="text-white">All Dramas</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold mb-6">All Dramas</h1>

      {/* Genre filter pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setActiveGenre(null)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeGenre === null
              ? "bg-red-600 text-white"
              : "bg-white/10 text-gray-300 hover:bg-white/20"
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
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeGenre === s.genre.id
                ? "bg-red-600 text-white"
                : "bg-white/10 text-gray-300 hover:bg-white/20"
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {section.dramas.map((drama) => (
                <div key={drama.id}>
                  <Link
                    href={`/episode/${drama.slug}`}
                    className="block group"
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#2a2a2a]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          drama.coverUrl ||
                          `https://picsum.photos/seed/${drama.slug}/300/450`
                        }
                        alt={drama.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  </Link>
                  <Link
                    href={`/drama/${drama.slug}`}
                    className="block mt-2 text-sm text-gray-300 hover:text-white line-clamp-2 leading-tight transition-colors"
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
