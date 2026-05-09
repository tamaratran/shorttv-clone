"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useCoins } from "@/context/CoinContext";
import Link from "next/link";

interface VerifyResponse {
  ok?: boolean;
  type?: string;
  coins?: number;
  plan?: string;
  error?: string;
}

function useVerifyPurchase() {
  const searchParams = useSearchParams();
  const { addCoins, activateVip } = useCoins();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  const verify = useCallback(async () => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      return { status: "error" as const, message: "No session found." };
    }

    try {
      const res = await fetch(
        `/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`,
      );
      const data: VerifyResponse = await res.json();

      if (!data.ok) {
        return {
          status: "error" as const,
          message: data.error ?? "Payment verification failed.",
        };
      }

      if (data.type === "coin_purchase" && data.coins) {
        addCoins(data.coins);
        return {
          status: "success" as const,
          message: `${data.coins.toLocaleString()} coins added to your balance!`,
        };
      }

      if (data.type === "vip_subscription" && data.plan) {
        const plan = data.plan === "week" ? "weekly" : "yearly";
        activateVip(plan as "weekly" | "yearly");
        return { status: "success" as const, message: `VIP ${plan} plan activated!` };
      }

      return { status: "success" as const, message: "Purchase complete!" };
    } catch {
      return {
        status: "error" as const,
        message: "Could not verify payment. Please contact support.",
      };
    }
  }, [searchParams, addCoins, activateVip]);

  useEffect(() => {
    let cancelled = false;
    verify().then((result) => {
      if (!cancelled) {
        setStatus(result.status);
        setMessage(result.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [verify]);

  return { status, message };
}

function PurchaseSuccessContent() {
  const { status, message } = useVerifyPurchase();

  return (
    <div className="max-w-md w-full text-center space-y-6">
        {status === "loading" && (
          <>
            <div className="w-12 h-12 mx-auto border-4 border-[#C5943A] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">Verifying your purchase…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">Payment Successful!</h1>
            <p className="text-gray-300">{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-gray-300">{message}</p>
          </>
        )}

        <Link
          href="/"
          className="inline-block px-6 py-3 bg-[#e50914] hover:bg-[#ff4d4d] text-white font-semibold rounded-xl transition-colors"
        >
          Back to Home
        </Link>
      </div>
  );
}

export default function PurchaseSuccessPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Suspense
        fallback={
          <div className="text-center">
            <div className="w-12 h-12 mx-auto border-4 border-[#C5943A] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 mt-4">Loading…</p>
          </div>
        }
      >
        <PurchaseSuccessContent />
      </Suspense>
    </div>
  );
}
