// ==============================================================================
// Strict Allowed-Origin, Referer Fallback, Sec-Fetch-Site & Payload Size Guard
// ==============================================================================

export interface SecurityCheckResult {
  ok: boolean;
  status?: number;
  error?: string;
}

function buildAllowedHostsSet(hostHeader: string | null): Set<string> {
  const isProd = process.env.NODE_ENV === 'production';
  const allowedHosts = new Set<string>();

  if (!isProd) {
    allowedHosts.add('localhost');
    allowedHosts.add('127.0.0.1');
  }

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredAppUrl) {
    try {
      const appHost = new URL(configuredAppUrl).hostname.toLowerCase();
      if (!isProd || (appHost !== 'localhost' && appHost !== '127.0.0.1')) {
        allowedHosts.add(appHost);
      }
    } catch {
      // Ignore invalid env URL
    }
  }

  // Only fall back to the request Host header in non-production or when NEXT_PUBLIC_APP_URL is not set
  if (hostHeader && (!isProd || allowedHosts.size === 0)) {
    const cleanHost = hostHeader.split(':')[0].toLowerCase();
    if (!isProd || (cleanHost !== 'localhost' && cleanHost !== '127.0.0.1')) {
      allowedHosts.add(cleanHost);
    }
  }

  return allowedHosts;
}

export function verifyRequestOriginAndCsrf(request: Request): SecurityCheckResult {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return { ok: true };
  }

  // 1. Check Fetch Metadata header when provided by modern browsers
  const secFetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
    return {
      ok: false,
      status: 403,
      error: 'Cross-origin mutation request denied (Sec-Fetch-Site policy).',
    };
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  const allowedHosts = buildAllowedHostsSet(host);

  // 2. Validate Origin header when present
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (!allowedHosts.has(originUrl.hostname.toLowerCase())) {
        return {
          ok: false,
          status: 403,
          error: 'Cross-origin mutation request denied.',
        };
      }
      return { ok: true };
    } catch {
      return {
        ok: false,
        status: 403,
        error: 'Malformed request Origin header.',
      };
    }
  }

  // 3. Fallback to Referer header validation when Origin is omitted
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (!allowedHosts.has(refererUrl.hostname.toLowerCase())) {
        return {
          ok: false,
          status: 403,
          error: 'Cross-origin Referer mutation request denied.',
        };
      }
      return { ok: true };
    } catch {
      return {
        ok: false,
        status: 403,
        error: 'Malformed request Referer header.',
      };
    }
  }

  // 4. In production, require either Origin or Referer on all state-changing requests
  if (process.env.NODE_ENV === 'production') {
    return {
      ok: false,
      status: 403,
      error: 'Missing Origin or Referer header on state-changing request.',
    };
  }

  return { ok: true };
}

export async function parseStrictJsonBody<T = unknown>(
  request: Request,
  maxBytes = 64 * 1024 // 64 KB default limit for JSON bodies
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const originCheck = verifyRequestOriginAndCsrf(request);
  if (!originCheck.ok) {
    return {
      ok: false,
      status: originCheck.status || 403,
      error: originCheck.error || 'Forbidden',
    };
  }

  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isNaN(contentLength) && contentLength > maxBytes) {
      return {
        ok: false,
        status: 413,
        error: 'Request payload exceeds maximum permitted size.',
      };
    }
  }

  try {
    const rawText = await request.text();
    if (Buffer.byteLength(rawText, 'utf8') > maxBytes) {
      return {
        ok: false,
        status: 413,
        error: 'Request payload exceeds maximum permitted size.',
      };
    }
    if (!rawText.trim()) {
      return {
        ok: false,
        status: 400,
        error: 'Request body cannot be empty.',
      };
    }
    const parsed = JSON.parse(rawText) as T;
    return { ok: true, data: parsed };
  } catch {
    return {
      ok: false,
      status: 400,
      error: 'Invalid JSON payload.',
    };
  }
}
