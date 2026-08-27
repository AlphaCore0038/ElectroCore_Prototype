import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const EVENTS_FILE = join(DATA_DIR, "electrocore.dat");

export type StoredEvent = {
  ts: string;
  type: string;
  conversationId?: string;
  intentId?: string;
  orderId?: string;
  slug?: string;
  product?: string;
  tool?: string;
  role?: string;
  content?: string;
  total?: number;
  currency?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

export function appendEvent(event: Omit<StoredEvent, "ts">): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    const line = JSON.stringify({ ...event, ts: new Date().toISOString() }) + "\n";
    appendFileSync(EVENTS_FILE, line, "utf-8");
  } catch {
    // filesystem failure must not break commerce
  }
}

export function readEvents(filter?: { type?: string; conversationId?: string }): StoredEvent[] {
  try {
    if (!existsSync(EVENTS_FILE)) return [];
    const raw = readFileSync(EVENTS_FILE, "utf-8");
    let events = raw.split("\n").filter(Boolean).map((l) => JSON.parse(l) as StoredEvent);
    if (filter?.type) events = events.filter((e) => e.type === filter.type);
    if (filter?.conversationId) events = events.filter((e) => e.conversationId === filter.conversationId);
    return events;
  } catch {
    return [];
  }
}

export function readRecentEvents(limit = 50): StoredEvent[] {
  const all = readEvents();
  return all.slice(-limit);
}
