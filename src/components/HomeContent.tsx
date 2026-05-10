"use client";

import { useState, useEffect } from "react";
import { HeroCarousel } from "./HeroCarousel";
import { GenreRow } from "./GenreRow";
import {
  fetchFeaturedVideos,
  fetchGenres,
  fetchVideosByGenre,
  type VideoDoc,
} from "@/services/firestore";
import { formatViews } from "@/lib/format";
import type { Drama, Genre } from "@/data/dramas";

function videoToDrama(v: VideoDoc): Drama {
  return {
    id: v.id,
    title: v.title,
    slug: v.slug,
    cover: v.coverUrl || `https://picsum.photos/seed/${v.slug}/300/450`,
    banner: v.bannerUrl || undefined,
    description: v.description,
    genres: v.genres,
    episodes: v.totalEpisodes,
    freeEpisodes: v.freeEpisodes,
    views: formatViews(v.views),
    likes: formatViews(v.likes),
    rating: v.rating,
  };
}

export function HomeContent() {
  const [featured, setFeatured] = useState<Drama[]>([]);
  const [genreRows, setGenreRows] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [featuredVideos, genres] = await Promise.all([
          fetchFeaturedVideos(),
          fetchGenres(),
        ]);

        setFeatured(featuredVideos.map(videoToDrama));

        const rows: Genre[] = [];
        for (const g of genres) {
          const videos = await fetchVideosByGenre(g.id, 10);
          if (videos.length > 0) {
            rows.push({
              id: g.id,
              name: g.name,
              emoji: g.emoji,
              dramas: videos.map(videoToDrama),
            });
          }
        }
        setGenreRows(rows);
      } catch (err) {
        console.error("Failed to load home data:", err);
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

  if (featured.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
        No dramas available yet.
      </div>
    );
  }

  return (
    <div>
      <HeroCarousel dramas={featured} />
      <div className="space-y-2">
        {genreRows.map((genre) => (
          <GenreRow key={genre.id} genre={genre} />
        ))}
      </div>
    </div>
  );
}
