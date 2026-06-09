export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { chargePreviewCredits } from "@/lib/square";

const TIERS = {
  "tier-3": { credits: 3, cents: 500 },
  "tier-10": { credits: 10, cents: 1000 },
  unlimited: { credits: 999, cents: 2000 },
} as const;

export async function POST(req: Request) {
  try {
    const { sourceId, tier } = await req.json();

    const config = TIERS[tier as keyof typeof TIERS];
    if (!config) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    await chargePreviewCredits(sourceId, config.cents);

    return NextResponse.json({ credits: config.credits });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Payment failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
