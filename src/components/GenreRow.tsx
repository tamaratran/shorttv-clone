"use client";

import { useRef } from "react";
import { DramaCard } from "./DramaCard";
import type { Genre } from "@/data/dramas";

interface GenreRowProps {
  genre: Genre;
}

export function GenreRow({ genre }: GenreRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 600, behavior: "smooth" });
  };

  return (
    <section className="py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-[26px] font-bold flex items-center gap-2">
            {genre.name}{" "}
            <span className="text-lg">{genre.emoji}</span>
          </h2>
          <button
            onClick={scrollRight}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label={`Scroll ${genre.name} right`}
          >
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
          </button>
        </div>
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto hide-scrollbar pb-2"
        >
          {genre.dramas.map((drama) => (
            <DramaCard key={drama.id} drama={drama} />
          ))}
        </div>
      </div>
    </section>
  );
}
