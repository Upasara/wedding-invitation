import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { POST as verifyCodePost } from '@/app/api/public/verify-code/route';
import { GET as publicInvitationGet } from '@/app/api/public/invitation/route';
import { GET as adminOverviewGet } from '@/app/api/admin/overview/route';
import { POST as adminUploadPost } from '@/app/api/admin/upload/route';
import { GET as adminRsvpsExportGet } from '@/app/api/admin/rsvps/export/route';
import {
  PUT as adminAccountPut,
  POST as adminAccountPost,
} from '@/app/api/admin/auth/account/route';
import ProtectedAdminLayout from '@/app/admin/(protected)/layout';
import { verifyFileMagicBytes } from '@/lib/security/file-validation';
import { verifyTurnstileToken } from '@/lib/security/turnstile';
import { getAdminUserByUid, resetLocalDatabaseToSeed } from '@/lib/db/repository';
import { resetRateLimitsForTesting } from '@/lib/security/rate-limit';
import { verifyRequestOriginAndCsrf } from '@/lib/security/csrf';
import * as sessionModule from '@/lib/security/session';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
} from '@/lib/security/session';

describe('API Route Handlers & Security Controls Integration Suite', () => {
  beforeEach(() => {
    process.env.WEDDING_STORAGE_DRIVER = 'local';
    resetLocalDatabaseToSeed();
    resetRateLimitsForTesting();
  });

  it('1. serves sanitized public invitation payload with active sections and Q&A', async () => {
    const res = await publicInvitationGet();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.content.coupleNames.displayTitle).toBe('Aurelia & Sebastian');
    expect(data.events.length).toBeGreaterThanOrEqual(3);
    expect(data.faqs.length).toBeGreaterThanOrEqual(5);
    expect(data.householdSession).toBeNull();
  });

  it('2. blocks cross-origin CSRF mutation attempts on POST endpoints', async () => {
    const req = new Request('http://localhost:3000/api/public/verify-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://malicious-attacker.example.com',
        Host: 'localhost:3000',
      },
      body: JSON.stringify({ code: 'PERERA-2026' }),
    });

    const res = await verifyCodePost(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Cross-origin');
  });

  it('3. enforces rate limiting on /api/public/verify-code to prevent code enumeration', async () => {
    for (let i = 0; i < 12; i++) {
      const req = new Request('http://localhost:3000/api/public/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '203.0.113.55',
        },
        body: JSON.stringify({ code: `ATTEMPT-${i}` }),
      });
      const res = await verifyCodePost(req);
      expect(res.status).toBe(401);
    }

    // 13th attempt within window must be blocked with 429 Too Many Requests
    const blockedReq = new Request(
      'http://localhost:3000/api/public/verify-code',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '203.0.113.55',
        },
        body: JSON.stringify({ code: 'PERERA-2026' }),
      }
    );
    const blockedRes = await verifyCodePost(blockedReq);
    expect(blockedRes.status).toBe(429);
  });

  it('4. denies unauthenticated access to protected /api/admin/* endpoints', async () => {
    const res = await adminOverviewGet();
    expect(res.status).toBe(401);

    const formData = new FormData();
    const uploadReq = new Request('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      body: formData,
    });
    const uploadRes = await adminUploadPost(uploadReq);
    expect(uploadRes.status).toBe(401);
  });

  it('5. blocks cross-site Sec-Fetch-Site and cross-origin Referer fallback in CSRF verifier', () => {
    const crossSiteFetchReq = new Request(
      'http://localhost:3000/api/public/rsvp',
      {
        method: 'POST',
        headers: {
          Host: 'localhost:3000',
          'Sec-Fetch-Site': 'cross-site',
        },
      }
    );
    expect(verifyRequestOriginAndCsrf(crossSiteFetchReq).ok).toBe(false);

    const crossOriginRefererReq = new Request(
      'http://localhost:3000/api/public/rsvp',
      {
        method: 'POST',
        headers: {
          Host: 'localhost:3000',
          Referer: 'https://evil-phishing.example.org/attack',
        },
      }
    );
    expect(verifyRequestOriginAndCsrf(crossOriginRefererReq).ok).toBe(false);

    const sameOriginRefererReq = new Request(
      'http://localhost:3000/api/public/rsvp',
      {
        method: 'POST',
        headers: {
          Host: 'localhost:3000',
          Referer: 'http://localhost:3000/invite',
        },
      }
    );
    expect(verifyRequestOriginAndCsrf(sameOriginRefererReq).ok).toBe(true);
  });

  it('6. validates binary file magic-byte signatures and rejects spoofed executables', () => {
    // Valid PNG magic header
    const validPng = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    expect(verifyFileMagicBytes(validPng, 'image/png')).toBe(true);

    // Valid JPEG magic header
    const validJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    expect(verifyFileMagicBytes(validJpeg, 'image/jpeg')).toBe(true);

    // Spoofed HTML/JS disguised as image/png
    const spoofedHtml = Buffer.from('<html><script>alert(1)</script></html>');
    expect(verifyFileMagicBytes(spoofedHtml, 'image/png')).toBe(false);
    expect(verifyFileMagicBytes(spoofedHtml, 'audio/mpeg')).toBe(false);
  });

  it('7. exports authenticated RSVP and household workbooks in .xlsx and .csv formats', async () => {
    const admin = await getAdminUserByUid('adm_primary');
    const token = createAdminSessionToken(
      admin!.uid,
      admin!.email,
      admin!.role,
      3600,
      admin!.passwordHash
    );

    const xlsxReq = new Request(
      'http://localhost:3000/api/admin/rsvps/export?format=xlsx',
      {
        method: 'GET',
        headers: {
          Host: 'localhost:3000',
          Cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
        },
      }
    );
    const xlsxRes = await adminRsvpsExportGet(xlsxReq);
    expect(xlsxRes.status).toBe(200);
    expect(xlsxRes.headers.get('Content-Type')).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    const arrayBuf = await xlsxRes.arrayBuffer();
    const workbook = XLSX.read(Buffer.from(arrayBuf), { type: 'buffer' });
    expect(workbook.SheetNames).toContain('Guest Attendance Roster');
    expect(workbook.SheetNames).toContain('Household Summary');

    const csvReq = new Request(
      'http://localhost:3000/api/admin/rsvps/export?format=csv',
      {
        method: 'GET',
        headers: {
          Host: 'localhost:3000',
          Cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
        },
      }
    );
    const csvRes = await adminRsvpsExportGet(csvReq);
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers.get('Content-Type')).toContain('text/csv');
    const csvText = await csvRes.text();
    expect(csvText).toContain('The Perera Family');
    expect(csvText).toContain('Dietary Notes');
  });

  it('8. processes authenticated image uploads and blocks spoofed binary uploads via POST /api/admin/upload', async () => {
    const admin = await getAdminUserByUid('adm_primary');
    const token = createAdminSessionToken(
      admin!.uid,
      admin!.email,
      admin!.role,
      3600,
      admin!.passwordHash
    );

    // 1. Valid PNG upload
    const validPngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const validFile = new File([validPngBytes], 'portrait.png', {
      type: 'image/png',
    });
    const validForm = new FormData();
    validForm.append('file', validFile);
    validForm.append('mediaType', 'image');

    const validReq = new Request('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      headers: {
        Host: 'localhost:3000',
        Origin: 'http://localhost:3000',
        Cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
      },
      body: validForm,
    });

    const validRes = await adminUploadPost(validReq);
    expect(validRes.status).toBe(200);
    const validData = await validRes.json();
    expect(validData.ok).toBe(true);
    expect(validData.url).toMatch(/^\/uploads\/img_.*\.png$/);

    // Clean up test uploaded file
    const uploadedDiskPath = path.join(
      process.cwd(),
      'public',
      validData.url.replace(/^\//, '')
    );
    if (fs.existsSync(uploadedDiskPath)) {
      fs.unlinkSync(uploadedDiskPath);
    }

    // 2. Spoofed executable disguised as image/png must be rejected with 400
    const spoofedFile = new File(
      [new Uint8Array(Buffer.from('MZ-fake-executable-header'))],
      'exploit.png',
      { type: 'image/png' }
    );
    const spoofedForm = new FormData();
    spoofedForm.append('file', spoofedFile);
    spoofedForm.append('mediaType', 'image');

    const spoofedReq = new Request('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      headers: {
        Host: 'localhost:3000',
        Origin: 'http://localhost:3000',
        Cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
      },
      body: spoofedForm,
    });

    const spoofedRes = await adminUploadPost(spoofedReq);
    expect(spoofedRes.status).toBe(400);
  });

  it('9. rotates wedding_admin_session cookie with updated pwdVer when administrator changes password via PUT /api/admin/auth/account', async () => {
    const admin = await getAdminUserByUid('adm_primary');
    const token = createAdminSessionToken(
      admin!.uid,
      admin!.email,
      admin!.role,
      3600,
      admin!.passwordHash
    );

    const req = new Request('http://localhost:3000/api/admin/auth/account', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Host: 'localhost:3000',
        Origin: 'http://localhost:3000',
        Cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
      },
      body: JSON.stringify({
        displayName: 'Chief Wedding Organizer',
        currentPassword: 'LuxuryWedding!2026',
        newPassword: 'NewLuxuryPassword!2028',
      }),
    });

    const res = await adminAccountPut(req);
    expect(res.status).toBe(200);
    const setCookieHeader = res.headers.get('set-cookie');
    expect(setCookieHeader).toContain(`${ADMIN_SESSION_COOKIE}=`);
  });

  it('10. fails closed when Turnstile is enabled in settings in production without TURNSTILE_SECRET_KEY, and rate-limits POST /api/admin/auth/account', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevSecret = process.env.TURNSTILE_SECRET_KEY;

    try {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      delete process.env.TURNSTILE_SECRET_KEY;

      const turnstileDisabledCheck = await verifyTurnstileToken(
        undefined,
        '203.0.113.10',
        false
      );
      expect(turnstileDisabledCheck.success).toBe(true);

      const turnstileEnabledCheck = await verifyTurnstileToken(
        undefined,
        '203.0.113.10',
        true
      );
      expect(turnstileEnabledCheck.success).toBe(false);
      expect(turnstileEnabledCheck.error).toContain('misconfigured');
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = prevNodeEnv;
      if (prevSecret === undefined) {
        delete process.env.TURNSTILE_SECRET_KEY;
      } else {
        process.env.TURNSTILE_SECRET_KEY = prevSecret;
      }
    }

    // Rate-limit check on POST /api/admin/auth/account (5 allowed per 15 min, 6th returns 429)
    for (let i = 1; i <= 5; i++) {
      const req = new Request('http://localhost:3000/api/admin/auth/account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Host: 'localhost:3000',
          Origin: 'http://localhost:3000',
          'x-forwarded-for': '198.51.100.77',
        },
        body: JSON.stringify({ email: 'organizer@luxurywedding.example' }),
      });
      const res = await adminAccountPost(req);
      expect(res.status).toBe(200);
    }

    const sixthReq = new Request('http://localhost:3000/api/admin/auth/account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Host: 'localhost:3000',
        Origin: 'http://localhost:3000',
        'x-forwarded-for': '198.51.100.77',
      },
      body: JSON.stringify({ email: 'organizer@luxurywedding.example' }),
    });
    const sixthRes = await adminAccountPost(sixthReq);
    expect(sixthRes.status).toBe(429);
    expect(sixthRes.headers.get('Retry-After')).toBeTruthy();
  });

  it('11. enforces SSR pwdVer and administrator role verification in ProtectedAdminLayout (S5-M1)', async () => {
    const admin = await getAdminUserByUid('adm_primary');
    expect(admin).not.toBeNull();

    const spy = vi.spyOn(sessionModule, 'getAdminSessionFromCookies');
    try {
      // 1. Stale or mismatched pwdVer must redirect to /admin/login (throws NEXT_REDIRECT)
      spy.mockResolvedValueOnce({
        type: 'admin',
        uid: admin!.uid,
        email: admin!.email,
        role: 'super_admin',
        pwdVer: '0000000000000000',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      await expect(
        ProtectedAdminLayout({ children: 'dashboard-child' })
      ).rejects.toThrow(/NEXT_REDIRECT/);

      // 2. Missing pwdVer when local passwordHash exists must redirect to /admin/login
      spy.mockResolvedValueOnce({
        type: 'admin',
        uid: admin!.uid,
        email: admin!.email,
        role: 'super_admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      await expect(
        ProtectedAdminLayout({ children: 'dashboard-child' })
      ).rejects.toThrow(/NEXT_REDIRECT/);

      // 3. Matching pwdVer and valid super_admin role renders the layout shell
      spy.mockResolvedValueOnce({
        type: 'admin',
        uid: admin!.uid,
        email: admin!.email,
        role: 'super_admin',
        pwdVer: admin!.passwordHash.slice(0, 16),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const rendered = await ProtectedAdminLayout({
        children: 'dashboard-child',
      });
      expect(rendered).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });
});

