import { NextRequest, NextResponse } from "next/server";
import { deleteEmail, deleteJob, clearAll } from "@/lib/db";

const API_SECRET = process.env.API_SECRET!;

function auth(req: NextRequest) {
  return req.headers.get("x-api-secret") === API_SECRET;
}

// DELETE /api/delete
// Body: { type: "email" | "job" | "all", id?: string }
export async function DELETE(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, id } = await req.json();

  if (type === "all") {
    await clearAll();
    return NextResponse.json({ success: true });
  }

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (type === "email") await deleteEmail(id);
  else if (type === "job") await deleteJob(id);
  else return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  return NextResponse.json({ success: true });
}
