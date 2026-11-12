// ==============================================================================
// Cloudflare Turnstile Verification Service
// ==============================================================================

export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp: string,
  turnstileEnabledInSettings: boolean
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // If Turnstile is not enabled in settings, pass cleanly
  if (!turnstileEnabledInSettings) {
    return { success: true };
  }

  // If Turnstile IS enabled in settings, require TURNSTILE_SECRET_KEY in production (fail-closed)
  if (!secretKey) {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        error: 'Security verification is misconfigured on the server.',
      };
    }
    return { success: true };
  }

  if (!token || !token.trim()) {
    return {
      success: false,
      error: 'Security verification challenge is required.',
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    formData.append('remoteip', remoteIp);

    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!res.ok) {
      return {
        success: false,
        error: 'Unable to validate security challenge.',
      };
    }

    const outcome = (await res.json()) as { success?: boolean };
    if (!outcome.success) {
      return {
        success: false,
        error: 'Security challenge verification failed. Please try again.',
      };
    }

    return { success: true };
  } catch {
    return {
      success: false,
      error: 'Security verification service temporarily unavailable.',
    };
  }
}

