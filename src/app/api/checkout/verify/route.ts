import { NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return Response.json({ ok: false, error: "Missing session_id" }, { status: 400 });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return Response.json({ ok: false, error: "Payment not completed" }, { status: 400 });
    }

    const meta = session.metadata ?? {};

    if (meta.type === "coin_purchase") {
      return Response.json({
        ok: true,
        type: "coin_purchase",
        coins: Number(meta.coins),
      });
    }

    if (meta.type === "vip_subscription") {
      return Response.json({
        ok: true,
        type: "vip_subscription",
        plan: meta.interval,
      });
    }

    return Response.json({ ok: true, type: "unknown" });
  } catch (err) {
    console.error("Session verification failed:", err);
    return Response.json({ ok: false, error: "Invalid session" }, { status: 400 });
  }
}
