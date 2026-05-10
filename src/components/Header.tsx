"use client";

import Link from "next/link";
import { useState } from "react";
import { useCoins } from "@/context/CoinContext";
import { PaywallModal } from "@/components/PaywallModal";

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const { balance, isVip } = useCoins();
  const [showTopUp, setShowTopUp] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#141516]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-[64px]">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#F6610F] rounded-lg flex items-center justify-center font-bold text-sm">
                S
              </div>
              <span className="text-xl font-bold tracking-tight">ShortMax</span>
            </Link>
            <nav className="hidden md:flex items-center gap-[60px]">
              <Link
                href="/"
                className="text-[#F6610F] font-bold text-lg hover:text-[#F6610F] transition-colors"
              >
                Home
              </Link>
              <Link
                href="/dramas"
                className="text-[#CCCDD4] font-bold text-lg hover:text-white transition-colors"
              >
                Dramas
              </Link>
              <span className="text-[#CCCDD4]/50 font-bold text-lg cursor-default">
                Download
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Coin balance */}
            <button
              onClick={() => setShowTopUp(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2a2a] border border-white/10 rounded-full hover:border-[#C5943A]/50 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#C5943A" />
                <circle cx="12" cy="12" r="8" fill="#D4A74A" />
                <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#8B6914">$</text>
              </svg>
              <span className="text-sm font-medium text-white">{balance}</span>
              {isVip && (
                <span className="text-[10px] font-bold text-[#C5943A] bg-[#C5943A]/20 px-1.5 py-0.5 rounded">
                  VIP
                </span>
              )}
            </button>

            <div className="relative hidden sm:block">
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border border-white/20 rounded-full px-4 py-1.5 text-sm text-white placeholder-gray-500 w-44 focus:outline-none focus:border-[#F6610F] transition-colors"
              />
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-300">
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
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"
                />
              </svg>
              <span className="hidden sm:inline">English</span>
            </div>
          </div>
        </div>
      </header>

      {showTopUp && (
        <PaywallModal
          episodeCost={0}
          onClose={() => setShowTopUp(false)}
        />
      )}
    </>
  );
}
