"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Drama } from "@/data/dramas";

interface HeroCarouselProps {
  dramas: Drama[];
}

export function HeroCarousel({ dramas }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % dramas.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [dramas.length]);

  const drama = dramas[current];

  return (
    <section className="relative w-full h-[400px] sm:h-[480px] lg:h-[540px] overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url(${drama.banner || drama.cover})` }}
      />
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#141516] via-[#141516]/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141516] via-transparent to-transparent" />

      {/* Content */}
      <div className="relative h-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold max-w-lg leading-tight mb-4">
          {drama.title}
        </h2>
        <p className="text-gray-300 text-sm max-w-md mb-6 line-clamp-2">
          {drama.description}
        </p>
        <Link
          href={`/episode/${drama.slug}`}
          className="inline-flex items-center gap-2 bg-white text-black font-bold text-xl px-10 py-2 rounded-full w-fit hover:bg-gray-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Play
        </Link>
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 right-4 sm:right-8 flex gap-2">
        {dramas.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              i === current ? "bg-white w-6" : "bg-white/40"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
