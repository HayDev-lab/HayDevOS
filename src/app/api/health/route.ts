import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.HAYDEV_RELEASE ?? process.env.RELEASE_SHA ?? "local",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
