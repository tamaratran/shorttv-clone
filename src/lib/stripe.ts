import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

export interface CoinPackageDef {
  id: string;
  coins: number;
  priceInCents: number;
  label: string;
}

export interface VipPlanDef {
  id: string;
  label: string;
  priceInCents: number;
  interval: "week" | "year";
}

export const COIN_PACKAGES: CoinPackageDef[] = [
  { id: "pkg-500", coins: 500, priceInCents: 499, label: "500 Coins" },
  { id: "pkg-1100", coins: 1100, priceInCents: 999, label: "1,100 Coins" },
  { id: "pkg-2400", coins: 2400, priceInCents: 1999, label: "2,400 Coins" },
  { id: "pkg-3900", coins: 3900, priceInCents: 2999, label: "3,900 Coins" },
  { id: "pkg-7500", coins: 7500, priceInCents: 4999, label: "7,500 Coins" },
  { id: "pkg-20000", coins: 20000, priceInCents: 9999, label: "20,000 Coins" },
];

export const VIP_PLANS: VipPlanDef[] = [
  { id: "weekly", label: "Weekly VIP", priceInCents: 1999, interval: "week" },
  { id: "yearly", label: "Yearly VIP", priceInCents: 19999, interval: "year" },
];
