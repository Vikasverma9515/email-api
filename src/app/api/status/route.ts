import { NextRequest, NextResponse } from "next/server";
import { getAllEmails, getAllJobs, getStats } from "@/lib/db";

const API_SECRET = process.env.API_SECRET!;

// Claude calls this at the start of every session to catch up on everything.
// Returns: stats, every company already contacted, every job saved, full email log.
export async function GET(req: NextRequest) {
  if (!API_SECRET || req.headers.get("x-api-secret") !== API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [stats, emails, jobs] = await Promise.all([getStats(), getAllEmails(), getAllJobs()]);

  // Deduplicated list of companies already emailed — Claude should never re-email these
  const companyMap = new Map<string, { company: string | null; email: string; name: string | null; last_contacted: string }>();
  for (const e of emails) {
    if (e.company && !companyMap.has(e.company)) {
      companyMap.set(e.company, { company: e.company, email: e.to_email, name: e.name, last_contacted: e.sent_at });
    }
  }
  const contactedCompanies = Array.from(companyMap.values());

  // Emails grouped by recipient so Claude can see full thread history
  const threads: Record<string, { company: string | null; name: string | null; emails: { subject: string; type: string; sent_at: string }[] }> = {};
  for (const e of emails) {
    if (!threads[e.to_email]) {
      threads[e.to_email] = { company: e.company, name: e.name, emails: [] };
    }
    threads[e.to_email].emails.push({ subject: e.subject, type: e.type, sent_at: e.sent_at });
  }

  return NextResponse.json({
    stats: {
      emails_sent: stats.total,
      companies_contacted: stats.companies,
      followups_sent: stats.followups,
      jobs_saved: stats.total_jobs,
      jobs_pending: stats.pending_jobs,
    },
    contacted_companies: contactedCompanies,
    threads,
    jobs: jobs.map((j) => ({
      id: j.id,
      company: j.company,
      role: j.role,
      url: j.url,
      source: j.source,
      status: j.status,
      found_at: j.found_at,
    })),
  });
}
