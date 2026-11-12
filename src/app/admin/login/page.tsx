'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  Mail,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import {
  isClientFirebaseAuthConfigured,
  sendAdminPasswordResetClient,
  signInAdminWithFirebaseClient,
} from '@/lib/firebase-client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('organizer@luxurywedding.example');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password Reset Mode
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const isDev = process.env.NODE_ENV !== 'production';

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let firebaseIdToken: string | undefined;
      if (isClientFirebaseAuthConfigured()) {
        try {
          const token = await signInAdminWithFirebaseClient(email, password);
          if (token) {
            firebaseIdToken = token;
          }
        } catch {
          setError('Invalid administrator email or password.');
          setLoading(false);
          return;
        }
      }

      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          ...(firebaseIdToken ? { firebaseIdToken } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid administrator credentials.');
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError('Unable to reach authentication service. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetMessage(null);

    try {
      if (isClientFirebaseAuthConfigured()) {
        try {
          await sendAdminPasswordResetClient(resetEmail);
        } catch {
          // Do not disclose account existence
        }
      }

      const res = await fetch('/api/admin/auth/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not process reset request.');
        return;
      }
      setResetMessage(
        data.message ||
          'If an active administrator account matches that email, password reset instructions have been sent.'
      );
    } catch {
      setError('Unable to process password reset request.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ivory flex flex-col justify-center py-12 px-4 sm:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-montserrat text-xs uppercase tracking-editorial text-mutedGray hover:text-charcoal"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-softGold" />
            <span>Return to Public Invitation</span>
          </Link>
        </div>

        <div className="border border-softGold/60 bg-warmWhite p-8 sm:p-10 shadow-editorial">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-softGold/70 bg-ivory">
              <Lock className="h-5 w-5 text-softGold" />
            </div>
            <p className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold">
              Private Administration Portal
            </p>
            <h1 className="mt-1 font-cormorant text-3xl sm:text-4xl text-charcoal">
              {resetMode ? 'Reset Administrator Password' : 'Wedding Organizer Sign In'}
            </h1>
          </div>

          {!resetMode ? (
            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="admin-email"
                  className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1.5"
                >
                  Administrator Email
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-mutedGray absolute left-3.5 top-3" />
                  <input
                    id="admin-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-editorialBorder bg-ivory pl-10 pr-3.5 py-2.5 font-montserrat text-xs text-charcoal"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="h-4 w-4 text-mutedGray absolute left-3.5 top-3" />
                  <input
                    id="admin-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter administrator password"
                    className="w-full border border-editorialBorder bg-ivory pl-10 pr-3.5 py-2.5 font-montserrat text-xs text-charcoal"
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 border border-red-800/30 bg-red-50 px-3.5 py-2.5 font-montserrat text-xs text-red-900"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-700" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full border border-charcoal bg-charcoal py-3.5 font-montserrat text-xs uppercase tracking-editorial text-ivory transition-colors hover:bg-transparent hover:text-charcoal disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In to Dashboard'}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs font-montserrat">
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setResetMode(true);
                    setError(null);
                  }}
                  className="text-mutedGray hover:text-charcoal underline"
                >
                  Forgot password?
                </button>

                {isDev && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('organizer@luxurywedding.example');
                      setPassword('LuxuryWedding!2026');
                    }}
                    className="text-softGold hover:text-charcoal"
                  >
                    Fill Local Dev Credentials
                  </button>
                )}
              </div>
            </form>
          ) : (
            <form onSubmit={handlePasswordReset} className="mt-8 space-y-5">
              <p className="font-montserrat text-xs text-mutedGray leading-relaxed">
                Enter your administrator email address below to request a password reset link via Firebase Authentication.
              </p>

              <div>
                <label
                  htmlFor="reset-email"
                  className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1.5"
                >
                  Administrator Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full border border-editorialBorder bg-ivory px-3.5 py-2.5 font-montserrat text-xs text-charcoal"
                />
              </div>

              {resetMessage && (
                <div className="flex items-start gap-2 border border-softGold bg-ivory px-3.5 py-3 font-montserrat text-xs text-charcoal">
                  <CheckCircle2 className="h-4 w-4 text-softGold shrink-0 mt-0.5" />
                  <span>{resetMessage}</span>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 border border-red-800/30 bg-red-50 px-3.5 py-2.5 font-montserrat text-xs text-red-900">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-700" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full border border-charcoal bg-charcoal py-3.5 font-montserrat text-xs uppercase tracking-editorial text-ivory transition-colors hover:bg-transparent hover:text-charcoal"
              >
                {loading ? 'Sending Request...' : 'Send Password Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setResetMode(false);
                  setError(null);
                  setResetMessage(null);
                }}
                className="w-full py-2 font-montserrat text-xs text-mutedGray hover:text-charcoal"
              >
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
