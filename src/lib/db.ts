import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;
function db() {
  if (!_client) {
    _client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: {
          // Bypass Next.js fetch cache so the dashboard always shows live data
          fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
        },
      }
    );
  }
  return _client;
}

export interface EmailRecord {
  id: string;
  to_email: string;
  name: string | null;
  company: string | null;
  subject: string;
  type: "initial" | "followup";
  apply_url: string | null;
  sent_at: string;
}

export interface JobRecord {
  id: string;
  company: string;
  role: string;
  url: string;
  source: string | null;
  notes: string | null;
  status: "to_apply" | "applied" | "skip";
  found_at: string;
}

export interface CompanyRow {
  company: string;
  recruiter_name: string | null;
  recruiter_email: string;
  apply_url: string | null;
  last_contacted: string;
  email_count: number;
}

export async function saveEmail(record: EmailRecord): Promise<void> {
  await db().from("emails").insert(record);
}

export async function getAllEmails(): Promise<EmailRecord[]> {
  const { data } = await db()
    .from("emails")
    .select("*")
    .order("sent_at", { ascending: false });
  return (data ?? []) as EmailRecord[];
}

export async function getCompanies(): Promise<CompanyRow[]> {
  const emails = await getAllEmails();
  const map = new Map<string, CompanyRow>();
  for (const e of emails) {
    const key = e.company ?? e.to_email;
    if (!map.has(key)) {
      map.set(key, {
        company: e.company ?? e.to_email,
        recruiter_name: e.name,
        recruiter_email: e.to_email,
        apply_url: e.apply_url,
        last_contacted: e.sent_at,
        email_count: 1,
      });
    } else {
      map.get(key)!.email_count++;
    }
  }
  return Array.from(map.values());
}

export async function saveJob(record: JobRecord): Promise<void> {
  await db().from("jobs").insert(record);
}

export async function getAllJobs(): Promise<JobRecord[]> {
  const { data } = await db()
    .from("jobs")
    .select("*")
    .order("found_at", { ascending: false });
  return (data ?? []) as JobRecord[];
}

export async function updateJobStatus(id: string, status: string): Promise<void> {
  await db().from("jobs").update({ status }).eq("id", id);
}

export async function deleteJob(id: string): Promise<void> {
  await db().from("jobs").delete().eq("id", id);
}

export async function deleteEmail(id: string): Promise<void> {
  await db().from("emails").delete().eq("id", id);
}

export async function clearAll(): Promise<void> {
  await Promise.all([
    db().from("emails").delete().neq("id", ""),
    db().from("jobs").delete().neq("id", ""),
  ]);
}

export async function getStats() {
  const [{ count: total }, { count: followups }, jobs] = await Promise.all([
    db().from("emails").select("*", { count: "exact", head: true }),
    db().from("emails").select("*", { count: "exact", head: true }).eq("type", "followup"),
    db().from("jobs").select("status"),
  ]);

  const allJobs = (jobs.data ?? []) as { status: string }[];
  const companies = await getCompanies();

  return {
    total: total ?? 0,
    companies: companies.length,
    followups: followups ?? 0,
    total_jobs: allJobs.length,
    pending_jobs: allJobs.filter((j) => j.status === "to_apply").length,
  };
}
