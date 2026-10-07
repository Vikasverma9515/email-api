import Database from "better-sqlite3";
import path from "path";
import { mkdirSync } from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "emails.db");

mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS emails (
    id          TEXT PRIMARY KEY,
    to_email    TEXT NOT NULL,
    name        TEXT,
    company     TEXT,
    subject     TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'initial',
    apply_url   TEXT,
    sent_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id          TEXT PRIMARY KEY,
    company     TEXT NOT NULL,
    role        TEXT NOT NULL,
    url         TEXT NOT NULL,
    source      TEXT,
    notes       TEXT,
    status      TEXT NOT NULL DEFAULT 'to_apply',
    found_at    TEXT NOT NULL
  );
`);

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

export interface CompanyRow {
  company: string;
  recruiter_name: string | null;
  recruiter_email: string;
  apply_url: string | null;
  last_contacted: string;
  email_count: number;
}

export function saveEmail(record: EmailRecord): void {
  db.prepare(`
    INSERT INTO emails (id, to_email, name, company, subject, type, apply_url, sent_at)
    VALUES (@id, @to_email, @name, @company, @subject, @type, @apply_url, @sent_at)
  `).run(record);
}

export function getAllEmails(): EmailRecord[] {
  return db.prepare(`SELECT * FROM emails ORDER BY sent_at DESC`).all() as EmailRecord[];
}

export function getCompanies(): CompanyRow[] {
  return db.prepare(`
    SELECT
      COALESCE(company, to_email)        AS company,
      MAX(name)                          AS recruiter_name,
      to_email                           AS recruiter_email,
      MAX(apply_url)                     AS apply_url,
      MAX(sent_at)                       AS last_contacted,
      COUNT(*)                           AS email_count
    FROM emails
    GROUP BY COALESCE(company, to_email)
    ORDER BY last_contacted DESC
  `).all() as CompanyRow[];
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

export function saveJob(record: JobRecord): void {
  db.prepare(`
    INSERT OR IGNORE INTO jobs (id, company, role, url, source, notes, status, found_at)
    VALUES (@id, @company, @role, @url, @source, @notes, @status, @found_at)
  `).run(record);
}

export function getAllJobs(): JobRecord[] {
  return db.prepare(`SELECT * FROM jobs ORDER BY found_at DESC`).all() as JobRecord[];
}

export function updateJobStatus(id: string, status: string): void {
  db.prepare(`UPDATE jobs SET status = ? WHERE id = ?`).run(status, id);
}

export function getStats() {
  const row = db.prepare(`
    SELECT
      COUNT(*)                                    AS total,
      COUNT(DISTINCT COALESCE(company, to_email)) AS companies,
      SUM(CASE WHEN type = 'followup' THEN 1 ELSE 0 END) AS followups,
      COUNT(DISTINCT CASE WHEN apply_url IS NOT NULL THEN COALESCE(company, to_email) END) AS to_apply
    FROM emails
  `).get() as { total: number; companies: number; followups: number; to_apply: number };

  const jobStats = db.prepare(`
    SELECT
      COUNT(*) AS total_jobs,
      SUM(CASE WHEN status = 'to_apply' THEN 1 ELSE 0 END) AS pending_jobs
    FROM jobs
  `).get() as { total_jobs: number; pending_jobs: number };

  return { ...row, ...jobStats };
}
