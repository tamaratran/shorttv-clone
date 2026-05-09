"use client";

import { useState } from "react";

interface VideoPlayerProps {
  dramaTitle: string;
  episode: number;
  locked: boolean;
  cover: string;
}

export function VideoPlayer({
  dramaTitle,
  episode,
  locked,
  cover,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="relative aspect-[9/16] max-h-[70vh] mx-auto bg-black rounded-lg overflow-hidden">
      {/* Poster/Cover */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cover}
        alt={`${dramaTitle} Episode ${episode}`}
        className="w-full h-full object-cover"
      />

      {/* Lock overlay */}
      {locked && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
          <svg
            className="w-12 h-12 text-yellow-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
          </svg>
          <p className="text-white font-medium text-center px-4">
            Unlock this episode with coins
          </p>
          <button className="bg-[#e50914] text-white px-6 py-2 rounded-full font-medium hover:bg-[#c40812] transition-colors">
            Unlock (50 coins)
          </button>
        </div>
      )}

      {/* Play overlay */}
      {!locked && !isPlaying && (
        <button
          onClick={() => setIsPlaying(true)}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="Play video"
        >
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}

      {/* Episode label */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <p className="text-white text-lg font-semibold">Episode {episode}</p>
        <div className="flex items-center gap-4 text-xs text-gray-300 mt-1">
          <span>00:00 / 02:28</span>
          <span>480P</span>
          <span>1x</span>
        </div>
      </div>
    </div>
  );
}
