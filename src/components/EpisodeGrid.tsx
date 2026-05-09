"use client";

import Link from "next/link";
import { useState } from "react";
import { useCoins } from "@/context/CoinContext";
import { PaywallModal } from "@/components/PaywallModal";

const EPISODE_COST = 60;

interface EpisodeGridProps {
  slug: string;
  totalEpisodes: number;
  freeEpisodes: number;
  currentEpisode?: number;
  maxDisplay?: number;
  columns?: string;
}

export function EpisodeGrid({
  slug,
  totalEpisodes,
  freeEpisodes,
  currentEpisode,
  maxDisplay,
  columns = "grid-cols-5 sm:grid-cols-8 md:grid-cols-10",
}: EpisodeGridProps) {
  const { isVip } = useCoins();
  const [showPaywall, setShowPaywall] = useState(false);
  const [pendingEpisode, setPendingEpisode] = useState<number | null>(null);
  const count = maxDisplay ? Math.min(maxDisplay, totalEpisodes) : totalEpisodes;

  const handleEpisodeClick = (epNum: number, isLocked: boolean) => {
    if (isLocked && !isVip) {
      setPendingEpisode(epNum);
      setShowPaywall(true);
    }
  };

  const handleUnlocked = () => {
    if (pendingEpisode) {
      window.location.href = `/episode/${slug}?ep=${pendingEpisode}`;
    }
  };

  return (
    <>
      <div className={`grid ${columns} gap-2`}>
        {Array.from({ length: count }, (_, i) => {
          const epNum = i + 1;
          const isLocked = epNum > freeEpisodes;
          const isCurrent = epNum === currentEpisode;

          if (isLocked && !isVip) {
            return (
              <button
                key={epNum}
                onClick={() => handleEpisodeClick(epNum, true)}
                className={`relative flex items-center justify-center h-10 rounded text-sm font-medium transition-colors ${
                  isCurrent
                    ? "bg-[#e50914] text-white"
                    : "bg-white/5 text-gray-500 hover:bg-white/10"
                }`}
              >
                {epNum}
                {!isCurrent && (
                  <svg
                    className="absolute top-0.5 right-0.5 w-2.5 h-2.5 text-yellow-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                  </svg>
                )}
              </button>
            );
          }

          return (
            <Link
              key={epNum}
              href={`/episode/${slug}?ep=${epNum}`}
              className={`relative flex items-center justify-center h-10 rounded text-sm font-medium transition-colors ${
                isCurrent
                  ? "bg-[#e50914] text-white"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {epNum}
            </Link>
          );
        })}
      </div>

      {showPaywall && (
        <PaywallModal
          episodeCost={EPISODE_COST}
          onClose={() => {
            setShowPaywall(false);
            setPendingEpisode(null);
          }}
          onUnlocked={handleUnlocked}
        />
      )}
    </>
  );
}
