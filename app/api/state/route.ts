import { NextResponse } from "next/server";
import { clearState, loadState } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const state = await loadState();
  return NextResponse.json({ state });
}

export async function DELETE() {
  await clearState();
  return NextResponse.json({ ok: true });
}
