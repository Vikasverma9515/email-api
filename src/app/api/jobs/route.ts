import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { saveJob, getAllJobs, updateJobStatus } from "@/lib/db";

const API_SECRET = process.env.API_SECRET!;

function auth(req: NextRequest) {
  return req.headers.get("x-api-secret") === API_SECRET;
}

// GET — list all saved jobs
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getAllJobs());
}

// POST — Claude saves a job it found
// Body: { company, role, url, source?, notes? }
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { company, role, url, source, notes } = await req.json();
  if (!company || !role || !url) {
    return NextResponse.json({ error: "Missing company, role, or url" }, { status: 400 });
  }

  const record = {
    id: uuidv4(),
    company,
    role,
    url,
    source: source ?? null,
    notes: notes ?? null,
    status: "to_apply" as const,
    found_at: new Date().toISOString(),
  };

  await saveJob(record);
  return NextResponse.json({ success: true, ...record });
}

// PATCH — update job status: { id, status: "applied" | "skip" | "to_apply" }
export async function PATCH(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ error: "Missing id or status" }, { status: 400 });

  await updateJobStatus(id, status);
  return NextResponse.json({ success: true });
}
