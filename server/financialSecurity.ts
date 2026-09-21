import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

export type FinancialEventType =
  | "PAYSTACK_INITIALIZE"
  | "PAYSTACK_VERIFY_SUCCESS"
  | "PAYSTACK_VERIFY_FAILED"
  | "PAYSTACK_REUSE_BLOCKED"
  | "PAYSTACK_WEBHOOK_RECEIVED"
  | "GIFT_SENT"
  | "GIFT_BLOCKED_INSUFFICIENT"
  | "GIFT_BLOCKED_INVALID"
  | "PK_GIFT_SENT"
  | "PK_GIFT_BLOCKED"
  | "PRIVATE_SESSION_JOIN"
  | "PRIVATE_SESSION_TICK"
  | "PRIVATE_SESSION_LEAVE"
  | "PRIVATE_SESSION_AUTO_TERMINATE"
  | "WITHDRAWAL_REQUESTED"
  | "WITHDRAWAL_APPROVED"
  | "WITHDRAWAL_REJECTED"
  | "WITHDRAWAL_BLOCKED"
  | "RATE_LIMIT_EXCEEDED"
  | "SECURITY_ALERT";

export interface FinancialAuditRecord {
  id: string;
  timestamp: string;
  eventType: FinancialEventType;
  userId: string;
  userEmail?: string;
  creatorId?: string;
  amountCoins?: number;
  amountDiamonds?: number;
  amountNgn?: number;
  reference?: string;
  idempotencyKey?: string;
  status: "SUCCESS" | "BLOCKED" | "FAILED" | "WARNING";
  ip?: string;
  userAgent?: string;
  details: Record<string, any>;
}

// In-Memory Financial Audit Log Store
const auditLogDatabase: FinancialAuditRecord[] = [];
const MAX_AUDIT_LOGS = 10000;

// Rate limiting in-memory bucket store
interface RateBucket {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateBucket>();

// Idempotency lock store to prevent race-condition double spends
const activeLocks = new Map<string, number>();
const processedIdempotencyRecords = new Map<string, { result: any; timestamp: number }>();

// Simulation security salt for test transactions
const SIMULATION_HMAC_SECRET = process.env.ADMIN_SECRET_KEY || "streamflow_audit_sim_sec_key_2026";

/**
 * Record an immutable audit log entry for financial operations
 */
export function logFinancialEvent(record: Omit<FinancialAuditRecord, "id" | "timestamp">): FinancialAuditRecord {
  const fullRecord: FinancialAuditRecord = {
    id: `AUD_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    timestamp: new Date().toISOString(),
    ...record,
  };

  auditLogDatabase.unshift(fullRecord);
  if (auditLogDatabase.length > MAX_AUDIT_LOGS) {
    auditLogDatabase.pop();
  }

  // Also log security warnings and blocked transactions to console for system monitoring
  if (fullRecord.status === "BLOCKED" || fullRecord.status === "FAILED") {
    console.warn(`[FINANCIAL AUDIT][${fullRecord.status}] ${fullRecord.eventType} - User: ${fullRecord.userId}`, fullRecord.details);
  } else {
    console.info(`[FINANCIAL AUDIT][SUCCESS] ${fullRecord.eventType} - User: ${fullRecord.userId}`);
  }

  return fullRecord;
}

/**
 * Retrieve filtered audit logs
 */
export function getFinancialAuditLogs(filter?: {
  userId?: string;
  creatorId?: string;
  eventType?: FinancialEventType;
  status?: string;
  limit?: number;
}): FinancialAuditRecord[] {
  let logs = [...auditLogDatabase];

  if (filter?.userId) {
    logs = logs.filter((l) => l.userId === filter.userId);
  }
  if (filter?.creatorId) {
    logs = logs.filter((l) => l.creatorId === filter.creatorId);
  }
  if (filter?.eventType) {
    logs = logs.filter((l) => l.eventType === filter.eventType);
  }
  if (filter?.status) {
    logs = logs.filter((l) => l.status === filter.status);
  }

  const limit = Math.min(filter?.limit || 100, 500);
  return logs.slice(0, limit);
}

/**
 * Sliding window rate limiting helper
 */
export function checkRateLimit(key: string, maxRequests: number, windowSeconds: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = rateLimitStore.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const newReset = now + windowSeconds * 1000;
    rateLimitStore.set(key, { count: 1, resetAt: newReset });
    return { allowed: true, remaining: maxRequests - 1, resetAt: newReset };
  }

  if (bucket.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { allowed: true, remaining: maxRequests - bucket.count, resetAt: bucket.resetAt };
}

/**
 * Express Middleware for Financial Rate Limiting
 */
export function financialRateLimiter(actionName: string, maxRequests: number, windowSeconds: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "ip_unknown";
    const userId = req.body?.userId || req.body?.senderId || req.body?.creatorId || req.query?.userId || "anon";
    const rateKey = `${actionName}:${ip}:${userId}`;

    const limitCheck = checkRateLimit(rateKey, maxRequests, windowSeconds);
    res.setHeader("X-RateLimit-Limit", maxRequests.toString());
    res.setHeader("X-RateLimit-Remaining", limitCheck.remaining.toString());
    res.setHeader("X-RateLimit-Reset", Math.ceil(limitCheck.resetAt / 1000).toString());

    if (!limitCheck.allowed) {
      logFinancialEvent({
        eventType: "RATE_LIMIT_EXCEEDED",
        userId: String(userId),
        status: "BLOCKED",
        ip: String(ip),
        details: { action: actionName, maxRequests, windowSeconds },
      });

      return res.status(429).json({
        error: `Too many requests for ${actionName}. Rate limit exceeded. Please try again in ${Math.ceil((limitCheck.resetAt - Date.now()) / 1000)}s.`,
        retryAfterSeconds: Math.ceil((limitCheck.resetAt - Date.now()) / 1000),
      });
    }

    next();
  };
}

/**
 * Idempotency Mutex Lock to prevent simultaneous double-spend race conditions
 */
export function acquireIdempotencyLock(key: string, ttlMs: number = 10000): boolean {
  const now = Date.now();
  const existingLockExpiry = activeLocks.get(key);

  if (existingLockExpiry && existingLockExpiry > now) {
    return false; // Currently locked by a parallel operation
  }

  activeLocks.set(key, now + ttlMs);
  return true;
}

export function releaseIdempotencyLock(key: string): void {
  activeLocks.delete(key);
}

export function saveProcessedIdempotencyResult(key: string, result: any): void {
  processedIdempotencyRecords.set(key, { result, timestamp: Date.now() });
  // Free active lock
  activeLocks.delete(key);
}

export function getProcessedIdempotencyResult(key: string): any | null {
  const entry = processedIdempotencyRecords.get(key);
  if (!entry) return null;
  return entry.result;
}

/**
 * Admin Secret Key Verification
 */
export function verifyAdminAuthorization(req: Request): boolean {
  const configuredSecret = process.env.ADMIN_SECRET_KEY || "sf_admin_sec_dev_2026";
  const providedKey = req.headers["x-admin-key"] || (req.headers["authorization"]?.replace(/^Bearer\s+/i, ""));

  if (!providedKey) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(String(providedKey)), Buffer.from(configuredSecret));
  } catch {
    return false;
  }
}

/**
 * Strict Input & Currency Math Invariants
 */
export function validateGiftCount(count: any, min: number = 1, max: number = 5000): { valid: boolean; value: number; error?: string } {
  const num = Math.floor(Number(count));
  if (!Number.isInteger(num) || !isFinite(num) || isNaN(num)) {
    return { valid: false, value: 0, error: "Gift count must be a valid integer." };
  }
  if (num < min) {
    return { valid: false, value: 0, error: `Minimum gift count is ${min}.` };
  }
  if (num > max) {
    return { valid: false, value: 0, error: `Maximum gift count per transaction is ${max.toLocaleString()}.` };
  }
  return { valid: true, value: num };
}

export function validateWithdrawalAmount(amountNgn: any, minNgn: number = 2000, maxNgn: number = 2000000): { valid: boolean; value: number; error?: string } {
  const num = Number(amountNgn);
  if (!isFinite(num) || isNaN(num) || num <= 0) {
    return { valid: false, value: 0, error: "Withdrawal amount must be a positive number." };
  }
  // Max 2 decimal precision
  const rounded = Math.round(num * 100) / 100;
  if (rounded < minNgn) {
    return { valid: false, value: 0, error: `Minimum withdrawal amount is ₦${minNgn.toLocaleString()}.` };
  }
  if (rounded > maxNgn) {
    return { valid: false, value: 0, error: `Maximum withdrawal limit per transaction is ₦${maxNgn.toLocaleString()}.` };
  }
  return { valid: true, value: rounded };
}

/**
 * Paystack Webhook Signature Verification (HMAC-SHA512)
 */
export function verifyPaystackWebhookSignature(rawBody: string, signature: string, secretKey: string): boolean {
  if (!rawBody || !signature || !secretKey) return false;
  try {
    const computedSignature = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(signature));
  } catch (err) {
    console.error("Paystack webhook HMAC validation error:", err);
    return false;
  }
}

/**
 * Cryptographic Token Generation for Simulation Approvals
 * Ensures that a client cannot verify a mock transaction without actually passing simulation approval.
 */
export function generateSimulationSignature(reference: string, userId: string, amountKobo: number): string {
  return crypto
    .createHmac("sha256", SIMULATION_HMAC_SECRET)
    .update(`${reference}:${userId}:${amountKobo}:TEST_APPROVED`)
    .digest("hex");
}

export function verifySimulationSignature(reference: string, userId: string, amountKobo: number, signature: string): boolean {
  if (!signature) return false;
  const expected = generateSimulationSignature(reference, userId, amountKobo);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
