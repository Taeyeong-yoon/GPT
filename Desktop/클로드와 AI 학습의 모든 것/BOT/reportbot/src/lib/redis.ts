import { Redis } from "@upstash/redis";

import type { ReportJSON } from "./schemas/report";

export type ScheduleFrequency =
  | "daily-9am"
  | "weekly-monday-9am"
  | "monthly-1st-9am";

export type ScheduleDataSource =
  | {
      type: "sheets";
      sheetUrl: string;
      range?: string;
    }
  | {
      type: "csv";
      fileName?: string;
    };

export type Schedule = {
  id: string;
  userId: string;
  templateId: string;
  dataSource: ScheduleDataSource;
  schedule: ScheduleFrequency;
  email: string;
  companyName: string;
  additionalNotes?: string | null;
  active: boolean;
  nextRun: string;
  lastRun?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SavedReport = {
  id: string;
  userId: string;
  templateId: string;
  createdAt: string;
  reportJson: ReportJSON;
};

export type ScheduleExecutionLog = {
  id: string;
  scheduleId: string;
  userId: string;
  status: "success" | "failed" | "skipped";
  createdAt: string;
  details?: string;
};

export type BillingRecord = {
  userId: string;
  billingKey: string;
  customerKey: string;
  plan: "pro" | "business";
  cardCompany: string;
  cardNumber: string;
  startDate: string;
  nextBillingDate: string;
  paymentKey?: string;
  active: boolean;
};

export type PaymentHistoryItem = {
  paymentKey: string;
  orderId: string;
  amount: number;
  date: string;
  status: string;
};

export type StoredUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  plan: "free" | "pro" | "business";
  createdAt: string;
};

const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;
const PLAN_LIMITS = {
  free: 999999, // TODO: 테스트 완료 후 3으로 복원
  pro: 30,
  business: 999999,
} as const;

let redisClient: Redis | null = null;

export function getRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis({
      url,
      token,
    });
  }

  return redisClient;
}

function getCurrentYearMonth() {
  return new Date().toISOString().slice(0, 7);
}

async function listKeysByPattern(pattern: string) {
  const redis = getRedisClient();

  if (!redis) {
    return [];
  }

  try {
    const scanFn = (redis as unknown as {
      scan?: (
        cursor: number | string,
        options?: { match?: string; count?: number },
      ) => Promise<[string | number, string[]]>;
    }).scan;

    if (scanFn) {
      const keys: string[] = [];
      let cursor: string | number = 0;

      do {
        const [nextCursor, batch]: [string | number, string[]] = await scanFn.call(redis, cursor, {
          match: pattern,
          count: 500,
        });
        keys.push(...batch);
        cursor = nextCursor;
      } while (String(cursor) !== "0");

      return keys;
    }
  } catch {
    return [];
  }

  try {
    const keysFn = (redis as unknown as {
      keys?: (value: string) => Promise<string[]>;
    }).keys;

    if (keysFn) {
      return await keysFn.call(redis, pattern);
    }
  } catch {
    return [];
  }

  return [];
}

export async function saveSchedule(schedule: Schedule) {
  const redis = getRedisClient();

  if (!redis) {
    return false;
  }

  await redis.set(`schedule:${schedule.id}`, schedule);
  await redis.sadd(`user:${schedule.userId}:schedules`, schedule.id);
  return true;
}

export async function getSchedule(id: string) {
  const redis = getRedisClient();

  if (!redis) {
    return null;
  }

  return redis.get<Schedule>(`schedule:${id}`);
}

export async function getUserSchedules(userId: string) {
  const redis = getRedisClient();

  if (!redis) {
    return [];
  }

  const ids = ((await redis.smembers(`user:${userId}:schedules`)) ?? []) as string[];
  const schedules = await Promise.all(ids.map((id) => getSchedule(id)));
  return schedules.filter((item): item is Schedule => Boolean(item));
}

export async function getAllSchedules() {
  const keys = await listKeysByPattern("schedule:*");
  const schedules = await Promise.all(
    keys.map((key) => getSchedule(key.replace(/^schedule:/, ""))),
  );
  return schedules.filter((item): item is Schedule => Boolean(item));
}

export async function updateSchedule(id: string, updates: Partial<Schedule>) {
  const current = await getSchedule(id);

  if (!current) {
    return false;
  }

  const nextValue: Schedule = {
    ...current,
    ...updates,
    id: current.id,
    userId: current.userId,
    updatedAt: new Date().toISOString(),
  };

  return saveSchedule(nextValue);
}

export async function deleteSchedule(id: string, userId: string) {
  const redis = getRedisClient();

  if (!redis) {
    return false;
  }

  await redis.del(`schedule:${id}`);
  await redis.srem(`user:${userId}:schedules`, id);
  return true;
}

export async function saveReport(report: SavedReport) {
  const redis = getRedisClient();

  if (!redis) {
    return false;
  }

  await redis.set(`report:${report.id}`, report, {
    ex: THIRTY_DAYS_IN_SECONDS,
  });
  await redis.lpush(`user:${report.userId}:reports`, report.id);
  return true;
}

export async function getReport(id: string) {
  const redis = getRedisClient();

  if (!redis) {
    return null;
  }

  return redis.get<SavedReport>(`report:${id}`);
}

export async function getUserReports(userId: string, limit = 20) {
  const redis = getRedisClient();

  if (!redis) {
    return [];
  }

  const ids =
    ((await redis.lrange(`user:${userId}:reports`, 0, Math.max(0, limit - 1))) ??
      []) as string[];
  const reports = await Promise.all(ids.map((id) => getReport(id)));
  return reports.filter((item): item is SavedReport => Boolean(item));
}

export async function incrementUsage(userId: string) {
  const redis = getRedisClient();

  if (!redis) {
    return 0;
  }

  return redis.hincrby(`usage:${userId}:${getCurrentYearMonth()}`, "count", 1);
}

export function getPlanLimit(plan: string) {
  return PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free;
}

export async function getUserPlan(userId: string) {
  const redis = getRedisClient();

  if (!redis) {
    return "free" as const;
  }

  const stored = await redis.get<string>(`user:${userId}:plan`);
  return (stored as "free" | "pro" | "business" | null) ?? "free";
}

export async function setUserPlan(userId: string, plan: string) {
  const redis = getRedisClient();

  if (!redis) {
    return false;
  }

  await redis.set(`user:${userId}:plan`, plan);
  return true;
}

export async function getUsage(userId: string) {
  const redis = getRedisClient();
  const plan = await getUserPlan(userId);

  if (!redis) {
    return {
      used: 0,
      limit: getPlanLimit(plan),
    };
  }

  const usage = await redis.hget<number>(
    `usage:${userId}:${getCurrentYearMonth()}`,
    "count",
  );

  return {
    used: Number(usage ?? 0),
    limit: getPlanLimit(plan),
  };
}

export async function resetMonthlyUsage(userId: string) {
  const redis = getRedisClient();

  if (!redis) {
    return false;
  }

  await redis.del(`usage:${userId}:${getCurrentYearMonth()}`);
  return true;
}

export async function saveScheduleExecutionLog(log: ScheduleExecutionLog) {
  const redis = getRedisClient();

  if (!redis) {
    return false;
  }

  await redis.set(`schedule-log:${log.id}`, log, {
    ex: THIRTY_DAYS_IN_SECONDS,
  });
  await redis.lpush(`schedule:${log.scheduleId}:logs`, log.id);
  return true;
}

export async function saveBillingRecord(record: BillingRecord) {
  const redis = getRedisClient();

  if (!redis) {
    return false;
  }

  await redis.set(`billing:${record.userId}`, record);
  return true;
}

export async function getBillingRecord(userId: string) {
  const redis = getRedisClient();

  if (!redis) {
    return null;
  }

  return redis.get<BillingRecord>(`billing:${userId}`);
}

export async function deleteBillingRecord(userId: string) {
  const redis = getRedisClient();

  if (!redis) {
    return false;
  }

  await redis.del(`billing:${userId}`);
  return true;
}

export async function getAllBillingRecords() {
  const keys = await listKeysByPattern("billing:*");
  const items = await Promise.all(
    keys.map((key) => getBillingRecord(key.replace(/^billing:/, ""))),
  );

  return items.filter((item): item is BillingRecord => Boolean(item));
}

export async function addPaymentHistory(userId: string, payment: PaymentHistoryItem) {
  const redis = getRedisClient();

  if (!redis) {
    return false;
  }

  await redis.lpush(`payments:${userId}`, payment);
  return true;
}

export async function getPaymentHistory(userId: string, limit = 20) {
  const redis = getRedisClient();

  if (!redis) {
    return [];
  }

  const items =
    ((await redis.lrange(`payments:${userId}`, 0, Math.max(0, limit - 1))) ??
      []) as PaymentHistoryItem[];

  return items;
}

export async function saveUser(user: StoredUser) {
  const redis = getRedisClient();

  if (!redis) {
    return false;
  }

  await redis.set(`user:${user.email}`, user);
  await redis.set(`user-id:${user.id}`, user.email);
  await setUserPlan(user.id, user.plan);
  return true;
}

export async function getUserByEmail(email: string) {
  const redis = getRedisClient();

  if (!redis) {
    return null;
  }

  return redis.get<StoredUser>(`user:${email}`);
}

export async function getUserById(userId: string) {
  const redis = getRedisClient();

  if (!redis) {
    return null;
  }

  const email = await redis.get<string>(`user-id:${userId}`);

  if (!email) {
    return null;
  }

  return getUserByEmail(email);
}
