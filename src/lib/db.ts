import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

// Local dev: writes to ./data/emails.json
// Vercel: writes to /tmp/emails.json (free, persists while the function is warm)
const DATA_DIR = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "emails.json");

export interface EmailRecord {
  id: string;
  to: string;
  subject: string;
  type: "initial" | "followup";
  sentAt: string;
  openedAt: string | null;
  openCount: number;
}

async function readAll(): Promise<EmailRecord[]> {
  try {
    const content = await readFile(DATA_FILE, "utf8");
    return JSON.parse(content) as EmailRecord[];
  } catch {
    return [];
  }
}

async function writeAll(emails: EmailRecord[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(emails, null, 2), "utf8");
}

export async function saveEmail(record: EmailRecord): Promise<void> {
  const emails = await readAll();
  emails.unshift(record); // newest first
  await writeAll(emails);
}

export async function getAllEmails(): Promise<EmailRecord[]> {
  return readAll();
}

export async function markOpened(id: string): Promise<void> {
  const emails = await readAll();
  const email = emails.find((e) => e.id === id);
  if (email) {
    email.openedAt = email.openedAt ?? new Date().toISOString();
    email.openCount = (email.openCount ?? 0) + 1;
    await writeAll(emails);
  }
}
