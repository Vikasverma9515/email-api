import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const TAB = "Emails";

export const DAILY_LIMIT = 50;
export const DEDUP_DAYS = 30;

// Columns: A=Timestamp  B=To  C=Subject  D=Type  E=Status
// Row 1 is the header row — data starts at A2

function auth() {
  return new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function getRows(): Promise<string[][]> {
  const sheets = google.sheets({ version: "v4", auth: auth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A2:E`,
  });
  return (res.data.values as string[][]) ?? [];
}

export async function logEmail(
  to: string,
  subject: string,
  type: "initial" | "followup"
): Promise<void> {
  const sheets = google.sheets({ version: "v4", auth: auth() });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A:E`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[new Date().toISOString(), to.toLowerCase(), subject, type, "sent"]],
    },
  });
}

// Returns true if we already emailed this address within DEDUP_DAYS
export async function isDuplicate(email: string): Promise<boolean> {
  const rows = await getRows();
  const cutoff = Date.now() - DEDUP_DAYS * 24 * 60 * 60 * 1000;
  return rows.some(
    (r) =>
      r[1]?.toLowerCase() === email.toLowerCase() &&
      new Date(r[0]).getTime() >= cutoff
  );
}

// Returns how many emails (any type) were sent today
export async function getDailyCount(): Promise<number> {
  const rows = await getRows();
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  return rows.filter((r) => r[0]?.startsWith(today)).length;
}
