"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface CoinState {
  balance: number;
  isVip: boolean;
  vipPlan: "weekly" | "yearly" | null;
}

interface CoinContextValue extends CoinState {
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  activateVip: (plan: "weekly" | "yearly") => void;
  canUnlock: (cost: number) => boolean;
}

const CoinContext = createContext<CoinContextValue | null>(null);

const STORAGE_KEY = "shortmax_coins";

function loadState(): CoinState {
  if (typeof window === "undefined") return { balance: 0, isVip: false, vipPlan: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { balance: 0, isVip: false, vipPlan: null };
}

function saveState(state: CoinState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function CoinProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CoinState>(loadState);

  const addCoins = useCallback((amount: number) => {
    setState((prev) => {
      const next = { ...prev, balance: prev.balance + amount };
      saveState(next);
      return next;
    });
  }, []);

  const spendCoins = useCallback((amount: number): boolean => {
    let success = false;
    setState((prev) => {
      if (prev.isVip || prev.balance >= amount) {
        const next = {
          ...prev,
          balance: prev.isVip ? prev.balance : prev.balance - amount,
        };
        saveState(next);
        success = true;
        return next;
      }
      return prev;
    });
    return success;
  }, []);

  const activateVip = useCallback((plan: "weekly" | "yearly") => {
    setState((prev) => {
      const next = { ...prev, isVip: true, vipPlan: plan };
      saveState(next);
      return next;
    });
  }, []);

  const canUnlock = useCallback(
    (cost: number) => state.isVip || state.balance >= cost,
    [state.isVip, state.balance]
  );

  return (
    <CoinContext.Provider
      value={{ ...state, addCoins, spendCoins, activateVip, canUnlock }}
    >
      {children}
    </CoinContext.Provider>
  );
}

export function useCoins() {
  const ctx = useContext(CoinContext);
  if (!ctx) throw new Error("useCoins must be used within CoinProvider");
  return ctx;
}
