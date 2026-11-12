import crypto from 'crypto';
import { getFirestoreDb, isFirebaseDriverConfigured } from '@/lib/db/firebase-admin';

// ==============================================================================
// Sliding-Window Rate Limiter (In-Memory Local + Distributed Firestore Support)
// ==============================================================================

interface RateLimitBucket {
  timestamps: number[];
  blockedUntil?: number;
}

const buckets = new Map<string, RateLimitBucket>();

export interface RateLimitConfig {
  namespace: string;
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = `${config.namespace}:${identifier}`;
  const existing = buckets.get(key) || { timestamps: [] };

  if (existing.blockedUntil && existing.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.blockedUntil - now) / 1000),
    };
  }

  const windowStart = now - config.windowMs;
  const activeTimestamps = existing.timestamps.filter((t) => t > windowStart);

  if (activeTimestamps.length >= config.maxRequests) {
    const blockMs = config.blockDurationMs || config.windowMs;
    const blockedUntil = now + blockMs;
    buckets.set(key, {
      timestamps: activeTimestamps,
      blockedUntil,
    });
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(blockMs / 1000),
    };
  }

  activeTimestamps.push(now);
  buckets.set(key, { timestamps: activeTimestamps });

  return {
    allowed: true,
    remaining: Math.max(0, config.maxRequests - activeTimestamps.length),
    retryAfterSeconds: 0,
  };
}

/**
 * Distributed rate limit check backed by a Firestore transaction when Firebase is configured,
 * falling back to the fast in-memory sliding window during local offline development.
 */
export async function checkRateLimitDistributed(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (!isFirebaseDriverConfigured()) {
    return checkRateLimit(identifier, config);
  }

  const firestore = getFirestoreDb();
  if (!firestore) {
    return checkRateLimit(identifier, config);
  }

  const docHash = crypto
    .createHash('sha256')
    .update(`${config.namespace}:${identifier}`)
    .digest('hex')
    .slice(0, 32);

  const docRef = firestore.collection('rate_limits').doc(`rl_${docHash}`);
  const now = Date.now();

  try {
    return await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const data = snap.exists
        ? (snap.data() as { timestamps?: number[]; blockedUntil?: number })
        : { timestamps: [] };

      if (data.blockedUntil && data.blockedUntil > now) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.ceil((data.blockedUntil - now) / 1000),
        };
      }

      const windowStart = now - config.windowMs;
      const activeTimestamps = (data.timestamps || []).filter(
        (t) => t > windowStart
      );

      if (activeTimestamps.length >= config.maxRequests) {
        const blockMs = config.blockDurationMs || config.windowMs;
        const blockedUntil = now + blockMs;
        tx.set(docRef, {
          namespace: config.namespace,
          timestamps: activeTimestamps,
          blockedUntil,
          updatedAt: now,
        });
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.ceil(blockMs / 1000),
        };
      }

      activeTimestamps.push(now);
      tx.set(docRef, {
        namespace: config.namespace,
        timestamps: activeTimestamps,
        blockedUntil: 0,
        updatedAt: now,
      });

      return {
        allowed: true,
        remaining: Math.max(0, config.maxRequests - activeTimestamps.length),
        retryAfterSeconds: 0,
      };
    });
  } catch {
    return checkRateLimit(identifier, config);
  }
}

export function extractClientIp(request: Request): string {
  // Prefer verified edge/proxy headers first
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp && /^[0-9a-fA-F:.]{3,45}$/.test(cfIp.trim())) {
    return cfIp.trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp && /^[0-9a-fA-F:.]{3,45}$/.test(realIp.trim())) {
    return realIp.trim();
  }
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first && /^[0-9a-fA-F:.]{3,45}$/.test(first)) {
      return first;
    }
  }
  return '127.0.0.1';
}

export function resetRateLimitsForTesting(): void {
  buckets.clear();
}
