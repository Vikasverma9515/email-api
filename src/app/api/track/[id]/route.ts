import { NextRequest, NextResponse } from "next/server";
import { markOpened } from "@/lib/db";

// 1×1 transparent GIF
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  // Fire-and-forget — don't let a DB error break the pixel response
  markOpened(params.id).catch(() => {});

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
