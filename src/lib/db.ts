import { Redis } from "@upstash/redis";

// Falls back to an in-memory store when Redis env vars are not set (local dev without Redis)
let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// In-memory fallback — data lives for the duration of the process only
const memStore = new Map<string, EmailRecord>();
const memList: string[] = [];

export interface EmailRecord {
  id: string;
  to: string;
  subject: string;
  type: "initial" | "followup";
  sentAt: string;
  openedAt: string | null;
  openCount: number;
}

export async function saveEmail(record: EmailRecord): Promise<void> {
  if (redis) {
    await redis.set(`email:${record.id}`, record);
    await redis.lpush("email_ids", record.id);
  } else {
    memStore.set(record.id, record);
    memList.unshift(record.id);
  }
}

export async function getAllEmails(): Promise<EmailRecord[]> {
  if (redis) {
    const ids = await redis.lrange<string>("email_ids", 0, -1);
    if (!ids.length) return [];
    const records = await Promise.all(ids.map((id) => redis!.get<EmailRecord>(`email:${id}`)));
    return records.filter(Boolean) as EmailRecord[];
  } else {
    return memList.map((id) => memStore.get(id)).filter(Boolean) as EmailRecord[];
  }
}

export async function markOpened(id: string): Promise<void> {
  if (redis) {
    const record = await redis.get<EmailRecord>(`email:${id}`);
    if (record) {
      await redis.set(`email:${id}`, {
        ...record,
        openedAt: record.openedAt ?? new Date().toISOString(),
        openCount: (record.openCount ?? 0) + 1,
      });
    }
  } else {
    const record = memStore.get(id);
    if (record) {
      record.openedAt = record.openedAt ?? new Date().toISOString();
      record.openCount = (record.openCount ?? 0) + 1;
    }
  }
}
