"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchVideos, type VideoDoc } from "@/services/firestore";

export default function DramasPage() {
  const [dramas, setDramas] = useState<VideoDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos({ limitCount: 100 })
      .then(setDramas)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="text-white">All Dramas</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold mb-8">All Dramas</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
        {dramas.map((drama) => (
          <div key={drama.id}>
            <Link href={`/episode/${drama.slug}`} className="block group">
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
    </div>
  );
}
