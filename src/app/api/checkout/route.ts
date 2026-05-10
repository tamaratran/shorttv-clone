import { NextRequest } from "next/server";
import { getStripe, COIN_PACKAGES, VIP_PLANS } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      packageId?: string;
      vipPlanId?: string;
    };

    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    // --- Coin package one-time purchase ---
    if (body.packageId) {
      const pkg = COIN_PACKAGES.find((p) => p.id === body.packageId);
      if (!pkg) {
        return Response.json({ error: "Invalid package" }, { status: 400 });
      }

      const session = await getStripe().checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: pkg.label },
              unit_amount: pkg.priceInCents,
            },
            quantity: 1,
          },
        ],
        adaptive_pricing: { enabled: false },
        metadata: {
          type: "coin_purchase",
          packageId: pkg.id,
          coins: String(pkg.coins),
        },
        success_url: `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}`,
      });

      return Response.json({ url: session.url });
    }

    // --- VIP subscription ---
    if (body.vipPlanId) {
      const plan = VIP_PLANS.find((p) => p.id === body.vipPlanId);
      if (!plan) {
        return Response.json({ error: "Invalid plan" }, { status: 400 });
      }

      const session = await getStripe().checkout.sessions.create({
        mode: "subscription",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: plan.label },
              unit_amount: plan.priceInCents,
              recurring: { interval: plan.interval },
            },
            quantity: 1,
          },
        ],
        adaptive_pricing: { enabled: false },
        metadata: {
          type: "vip_subscription",
          planId: plan.id,
          interval: plan.interval,
        },
        success_url: `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}`,
      });

      return Response.json({ url: session.url });
    }

    return Response.json(
      { error: "Provide packageId or vipPlanId" },
      { status: 400 },
    );
  } catch (err) {
    console.error("Checkout error:", err);
    return Response.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
