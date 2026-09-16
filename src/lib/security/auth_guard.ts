import crypto from 'crypto';

interface FailureRecord {
  count: number;
  firstFailedAt: number;
  lastFailedAt: number;
}

interface SingleUseToken {
  userId: number | string;
  expiresAt: number;
  consumed: boolean;
}

// In-memory sliding window stores (per-process fallback with TTL purge)
const userFailures = new Map<string, FailureRecord>();
const rollFailures = new Map<string, FailureRecord>();
const activeTokens = new Map<string, SingleUseToken>();
const userBindings = new Map<string, { rollNumber: string; boundAt: number }>();

const SECRET_KEY = process.env.AUTH_TOKEN_SECRET || process.env.TELEGRAM_BOT_TOKEN || 'ims_nsut_secure_guard_fallback_key';
const USER_FAILURE_LIMIT = 3;
const USER_LOCKOUT_MS = 15 * 60 * 1000; // 15 mins
const ROLL_FAILURE_LIMIT = 3;
const ROLL_LOCKOUT_MS = 30 * 60 * 1000; // 30 mins
const TOKEN_TTL_MS = 3 * 60 * 1000; // 3 mins single-use

/**
 * Clean up expired records to prevent memory leak
 */
function cleanupExpiredRecords() {
  const now = Date.now();
  for (const [k, v] of userFailures.entries()) {
    if (now - v.firstFailedAt > USER_LOCKOUT_MS) userFailures.delete(k);
  }
  for (const [k, v] of rollFailures.entries()) {
    if (now - v.firstFailedAt > ROLL_LOCKOUT_MS) rollFailures.delete(k);
  }
  for (const [k, v] of activeTokens.entries()) {
    if (now > v.expiresAt || v.consumed) activeTokens.delete(k);
  }
}

/**
 * Generate a short-TTL (3-minute) single-use launch token bound to Telegram User ID
 */
export function generateWebAppToken(userId: number | string): string {
  cleanupExpiredRecords();
  const nonce = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${userId}:${expiresAt}:${nonce}`;
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
  const token = `${Buffer.from(payload).toString('base64url')}.${signature}`;

  activeTokens.set(token, {
    userId,
    expiresAt,
    consumed: false,
  });

  return token;
}

/**
 * Validate and consume a single-use token
 */
export function validateAndConsumeToken(token: string): { valid: boolean; userId?: number | string; error?: string } {
  cleanupExpiredRecords();
  if (!token) return { valid: false, error: 'Token missing' };

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return { valid: false, error: 'Malformed token' };

  try {
    const payload = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return { valid: false, error: 'Invalid token signature' };
    }

    const [userIdStr, expiresAtStr] = payload.split(':');
    const expiresAt = parseInt(expiresAtStr, 10);

    if (Date.now() > expiresAt) {
      return { valid: false, error: 'Token expired. Please reopen from Telegram.' };
    }

    const stored = activeTokens.get(token);
    if (!stored || stored.consumed) {
      return { valid: false, error: 'Token already used or expired. Please reopen from Telegram.' };
    }

    // Mark single-use token as consumed immediately
    stored.consumed = true;
    activeTokens.delete(token);

    return { valid: true, userId: userIdStr };
  } catch {
    return { valid: false, error: 'Token validation failed' };
  }
}

/**
 * Check if the user or roll number has exceeded the failure limit
 */
export function checkRateLimits(
  userId: string | number,
  rollNumber: string
): { allowed: boolean; remainingWaitSeconds?: number; requiresManualCaptcha: boolean } {
  cleanupExpiredRecords();
  const now = Date.now();
  const userKey = String(userId).trim();
  const rollKey = rollNumber.toUpperCase().trim();

  const userRec = userFailures.get(userKey);
  const rollRec = rollFailures.get(rollKey);

  // Check user lockout
  if (userRec && userRec.count >= USER_FAILURE_LIMIT) {
    const elapsed = now - userRec.lastFailedAt;
    if (elapsed < USER_LOCKOUT_MS) {
      const remainingSec = Math.ceil((USER_LOCKOUT_MS - elapsed) / 1000);
      return { allowed: false, remainingWaitSeconds: remainingSec, requiresManualCaptcha: true };
    }
    userFailures.delete(userKey);
  }

  // Check roll lockout (global cross-user protection)
  if (rollRec && rollRec.count >= ROLL_FAILURE_LIMIT) {
    const elapsed = now - rollRec.lastFailedAt;
    if (elapsed < ROLL_LOCKOUT_MS) {
      const remainingSec = Math.ceil((ROLL_LOCKOUT_MS - elapsed) / 1000);
      return { allowed: false, remainingWaitSeconds: remainingSec, requiresManualCaptcha: true };
    }
    rollFailures.delete(rollKey);
  }

  // Force manual CAPTCHA entry if there's any active failure record on this roll
  const requiresManualCaptcha = Boolean((userRec && userRec.count > 0) || (rollRec && rollRec.count > 0));

  return { allowed: true, requiresManualCaptcha };
}

/**
 * Record an authentication failure (Increments failure budget)
 */
export function recordAuthFailure(userId: string | number, rollNumber: string) {
  const now = Date.now();
  const userKey = String(userId).trim();
  const rollKey = rollNumber.toUpperCase().trim();

  const uRec = userFailures.get(userKey) || { count: 0, firstFailedAt: now, lastFailedAt: now };
  uRec.count += 1;
  uRec.lastFailedAt = now;
  userFailures.set(userKey, uRec);

  const rRec = rollFailures.get(rollKey) || { count: 0, firstFailedAt: now, lastFailedAt: now };
  rRec.count += 1;
  rRec.lastFailedAt = now;
  rollFailures.set(rollKey, rRec);
}

/**
 * Record an authentication success (Clears failure state and binds roll number)
 */
export function recordAuthSuccess(userId: string | number, rollNumber: string) {
  const userKey = String(userId).trim();
  const rollKey = rollNumber.toUpperCase().trim();

  // Clear failure records on genuine success
  userFailures.delete(userKey);
  rollFailures.delete(rollKey);

  // Bind account
  userBindings.set(userKey, {
    rollNumber: rollKey,
    boundAt: Date.now(),
  });
}

/**
 * Unbind account (Self-service recovery)
 */
export function unbindAccount(userId: string | number): boolean {
  const userKey = String(userId).trim();
  return userBindings.delete(userKey);
}

/**
 * Get bound roll number for Telegram user
 */
export function getBoundRollNumber(userId: string | number): string | null {
  const userKey = String(userId).trim();
  const binding = userBindings.get(userKey);
  return binding ? binding.rollNumber : null;
}

/**
 * Generic opaque error message to avoid oracle disclosure
 */
export const GENERIC_AUTH_ERROR =
  'Authentication unsuccessful. Please ensure your credentials are valid on the official IMS portal and try again.';
