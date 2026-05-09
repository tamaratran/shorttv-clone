"use client";

import { useState } from "react";
import { useCoins } from "@/context/CoinContext";

interface PaywallModalProps {
  episodeCost: number;
  onClose: () => void;
  onUnlocked?: () => void;
}

interface CoinPackage {
  id: string;
  coins: number;
  immediate: number;
  free: number;
  bonus: number;
  price: string;
}

const COIN_PACKAGES: CoinPackage[] = [
  { id: "pkg-500", coins: 500, immediate: 500, free: 0, bonus: 0, price: "$4.99" },
  { id: "pkg-1100", coins: 1100, immediate: 1000, free: 100, bonus: 10, price: "$9.99" },
  { id: "pkg-2400", coins: 2400, immediate: 2000, free: 400, bonus: 20, price: "$19.99" },
  { id: "pkg-3900", coins: 3900, immediate: 3000, free: 900, bonus: 30, price: "$29.99" },
  { id: "pkg-7500", coins: 7500, immediate: 5000, free: 2500, bonus: 50, price: "$49.99" },
  { id: "pkg-20000", coins: 20000, immediate: 10000, free: 10000, bonus: 100, price: "$99.99" },
];

const VIP_PLANS = [
  {
    id: "weekly",
    label: "Weekly VIP",
    price: "$19.99",
    period: "weekly" as const,
  },
  {
    id: "yearly",
    label: "Yearly VIP",
    price: "$199.99",
    period: "yearly" as const,
  },
];

type PaymentMethod = "quick" | "apple" | "google" | "paypal";

const CoinIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#C5943A" />
    <circle cx="12" cy="12" r="8" fill="#D4A74A" />
    <text
      x="12"
      y="16"
      textAnchor="middle"
      fontSize="11"
      fontWeight="bold"
      fill="#8B6914"
    >
      $
    </text>
  </svg>
);

export function PaywallModal({ episodeCost, onClose, onUnlocked }: PaywallModalProps) {
  const { balance, isVip, addCoins, spendCoins, activateVip } = useCoins();
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("quick");
  const [purchasing, setPurchasing] = useState(false);

  const handleUnlock = () => {
    if (isVip) {
      onUnlocked?.();
      onClose();
    } else if (balance >= episodeCost) {
      spendCoins(episodeCost);
      onUnlocked?.();
      onClose();
    }
  };

  const handleBuyCoins = (pkg: CoinPackage) => {
    setPurchasing(true);
    setTimeout(() => {
      addCoins(pkg.coins);
      setPurchasing(false);
    }, 600);
  };

  const handleVipPurchase = (plan: "weekly" | "yearly") => {
    setPurchasing(true);
    setTimeout(() => {
      activateVip(plan);
      setPurchasing(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] sm:rounded-2xl rounded-t-2xl shadow-2xl border border-white/10 animate-slide-up">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-[#1a1a1a] flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-6 text-sm">
            <span className="flex items-center gap-2 text-gray-200">
              Price:
              <CoinIcon className="w-4 h-4" />
              <span className="font-semibold text-white">{episodeCost}</span>
            </span>
            <span className="text-white/30">|</span>
            <span className="flex items-center gap-2 text-gray-200">
              Balance:
              <CoinIcon className="w-4 h-4" />
              <span className="font-semibold text-white">{balance}</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Unlock button (if user can afford) */}
          {(isVip || balance >= episodeCost) && (
            <button
              onClick={handleUnlock}
              disabled={purchasing}
              className="w-full py-3 rounded-xl font-bold text-lg bg-gradient-to-r from-[#F6610F] to-[#FF8A3D] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isVip ? "Unlock (VIP Free)" : `Unlock Episode (${episodeCost} coins)`}
            </button>
          )}

          {/* VIP Section */}
          <div>
            <h3 className="text-lg font-bold mb-1">VIP Unlock all series for free</h3>
            <p className="text-xs text-gray-400 mb-4">Auto renew. Cancel anytime.</p>
            <div className="grid grid-cols-2 gap-3">
              {VIP_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => handleVipPurchase(plan.period)}
                  disabled={purchasing || isVip}
                  className="relative text-left p-4 rounded-xl border-2 border-[#C5943A]/40 bg-gradient-to-br from-[#2a2218] to-[#1a1a1a] hover:border-[#C5943A]/80 transition-colors disabled:opacity-50 group overflow-hidden"
                >
                  {/* Decorative crown watermark */}
                  <div className="absolute top-2 right-2 text-[#C5943A]/20 text-4xl pointer-events-none">
                    ♛
                  </div>
                  <p className="text-sm font-medium text-gray-300">{plan.label}</p>
                  <p className="text-2xl font-bold text-[#C5943A] mt-1">{plan.price}</p>
                  <p className="text-xs text-gray-400 mt-1">Auto-renew. Cancel anytime.</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-300">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-[#C5943A]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Unlimited Viewing
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-[#C5943A]" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <text x="12" y="15" textAnchor="middle" fontSize="8" fill="#1a1a1a" fontWeight="bold">HD</text>
                      </svg>
                      1080p High Quality
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Coin Packages */}
          <div>
            <h3 className="text-lg font-bold mb-4">Top up coins</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {COIN_PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handleBuyCoins(pkg)}
                  disabled={purchasing}
                  className="relative text-left p-4 rounded-xl bg-[#222] border border-white/10 hover:border-[#C5943A]/60 transition-colors disabled:opacity-50"
                >
                  {pkg.bonus > 0 && (
                    <span className="absolute -top-2 -right-2 bg-[#F6610F] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      +{pkg.bonus}%
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <CoinIcon className="w-5 h-5" />
                    <span className="text-lg font-bold text-white">
                      {pkg.coins.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Immediately: {pkg.immediate.toLocaleString()}
                  </p>
                  {pkg.free > 0 && (
                    <p className="text-xs text-gray-400">
                      Free: {pkg.free.toLocaleString()}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-white mt-2">{pkg.price}</p>
                </button>
              ))}
            </div>
          </div>

          {/* More Plan */}
          <div className="text-center">
            <button className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1">
              More Plan
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Payment Methods */}
          <div>
            <h3 className="text-lg font-bold mb-4">Payment Methods</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(
                [
                  { id: "quick" as PaymentMethod, label: "Quick Pay", icon: "💳" },
                  { id: "apple" as PaymentMethod, label: "Apple Pay", icon: "" },
                  { id: "google" as PaymentMethod, label: "Google Pay", icon: "" },
                  { id: "paypal" as PaymentMethod, label: "PayPal", icon: "" },
                ] as const
              ).map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(method.id)}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-colors border ${
                    selectedPayment === method.id
                      ? "bg-white text-black border-white"
                      : "bg-[#2a2a2a] text-gray-300 border-white/10 hover:border-white/30"
                  }`}
                >
                  {method.id === "quick" && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  )}
                  {method.id === "apple" && (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                  )}
                  {method.id === "google" && (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  {method.id === "paypal" && (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.4c-.564 0-1.04.408-1.13.964l-.947 6.036a.474.474 0 01-.247.006z" fill="#003087" />
                      <path d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132L6.596 26.83a.554.554 0 00.548.639h3.882c.563 0 1.04-.408 1.13-.964l.466-2.958a1.146 1.146 0 011.13-.965h.712c4.612 0 8.22-1.874 9.276-7.296.44-2.27.212-4.165-.692-5.62" fill="#0070E0" />
                    </svg>
                  )}
                  {method.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
