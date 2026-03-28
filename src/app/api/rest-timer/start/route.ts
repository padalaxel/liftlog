import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const restSeconds = Number(body.rest_seconds ?? 0);
  if (!Number.isFinite(restSeconds) || restSeconds <= 0) {
    return NextResponse.json({ error: "rest_seconds must be positive" }, { status: 400 });
  }
  return NextResponse.json({ started_at: new Date().toISOString(), rest_seconds: restSeconds });
}
