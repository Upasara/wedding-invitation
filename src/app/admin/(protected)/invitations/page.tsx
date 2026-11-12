'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  KeyRound,
  RefreshCw,
  Ban,
  CheckCircle2,
  Copy,
  Search,
  AlertCircle,
  Download,
} from 'lucide-react';
import { AdminHouseholdWithRsvpView } from '@/lib/db/repository';

interface HouseholdFormState {
  id?: string;
  displayName: string;
  category: 'individual' | 'couple' | 'family' | 'group';
  members: Array<{ id?: string; fullName: string; title?: string }>;
  additionalGuestAllowance: number;
  status: 'active' | 'inactive' | 'revoked';
  adminNotes: string;
  customPlaintextCode: string;
}

const INITIAL_FORM: HouseholdFormState = {
  displayName: '',
  category: 'family',
  members: [{ fullName: '' }],
  additionalGuestAllowance: 0,
  status: 'active',
  adminNotes: '',
  customPlaintextCode: '',
};

export default function AdminInvitationsPage() {
  const [households, setHouseholds] = useState<AdminHouseholdWithRsvpView[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editing, setEditing] = useState<HouseholdFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [issuedCodeBanner, setIssuedCodeBanner] = useState<{
    householdName: string;
    code: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/households')
      .then((r) => r.json())
      .then((d) => {
        if (d.households) setHouseholds(d.households);
      });
  }, []);

  async function handleSaveHousehold(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    const validMembers = editing.members.filter((m) => m.fullName.trim().length >= 2);
    if (validMembers.length === 0) {
      setError('Please add at least one invited household member.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        id: editing.id,
        displayName: editing.displayName,
        category: editing.category,
        members: validMembers,
        additionalGuestAllowance: Number(editing.additionalGuestAllowance),
        status: editing.status,
        adminNotes: editing.adminNotes,
      };
      if (editing.customPlaintextCode.trim()) {
        payload.customPlaintextCode = editing.customPlaintextCode.trim();
      }

      const res = await fetch('/api/admin/households', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save household.');
        return;
      }

      if (data.households) setHouseholds(data.households);
      if (data.generatedPlaintextCode) {
        setIssuedCodeBanner({
          householdName: editing.displayName,
          code: data.generatedPlaintextCode,
        });
      }
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleCodeAction(
    household: AdminHouseholdWithRsvpView,
    action: 'regenerate' | 'revoke' | 'activate'
  ) {
    const confirmText =
      action === 'revoke'
        ? `Revoke the invitation code for "${household.displayName}"? Guests will no longer be able to access or update their RSVP with their current code.`
        : action === 'regenerate'
        ? `Generate a brand-new invitation code for "${household.displayName}"? Their previous code will be permanently revoked.`
        : `Re-activate "${household.displayName}"?`;

    if (!window.confirm(confirmText)) return;

    setError(null);
    const res = await fetch(`/api/admin/households/${household.id}/code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (res.ok && data.households) {
      setHouseholds(data.households);
      if (data.generatedPlaintextCode) {
        setIssuedCodeBanner({
          householdName: household.displayName,
          code: data.generatedPlaintextCode,
        });
      }
    } else {
      setError(data.error || 'Failed to update household invitation code.');
    }
  }

  async function handleDeleteHousehold(hh: AdminHouseholdWithRsvpView) {
    if (
      !window.confirm(
        `Permanently delete household "${hh.displayName}" and its RSVP record?`
      )
    ) {
      return;
    }
    const res = await fetch(
      `/api/admin/households?id=${encodeURIComponent(hh.id)}`,
      { method: 'DELETE' }
    );
    const data = await res.json();
    if (res.ok && data.households) {
      setHouseholds(data.households);
    }
  }

  const filtered = households.filter((hh) => {
    if (statusFilter !== 'all' && hh.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      hh.displayName.toLowerCase().includes(q) ||
      hh.members.some((m) => m.fullName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-editorialBorder pb-5">
        <div>
          <p className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold">
            Household &amp; Code Security
          </p>
          <h1 className="mt-1 font-cormorant text-3xl sm:text-4xl text-charcoal">
            Household Invitations &amp; Codes
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/rsvps/export?format=xlsx"
            className="inline-flex items-center gap-2 border border-editorialBorder bg-warmWhite px-4 py-2.5 font-montserrat text-xs uppercase tracking-wider text-charcoal hover:border-softGold"
          >
            <Download className="h-3.5 w-3.5 text-softGold" />
            <span>Export Households (.xlsx)</span>
          </a>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setEditing(INITIAL_FORM);
            }}
            className="inline-flex items-center gap-2 border border-charcoal bg-charcoal px-5 py-2.5 font-montserrat text-xs uppercase tracking-editorial text-ivory hover:bg-transparent hover:text-charcoal"
          >
            <Plus className="h-4 w-4 text-softGold" />
            <span>Create Household Invitation</span>
          </button>
        </div>
      </div>

      {/* One-Time Generated Code Banner */}
      {issuedCodeBanner && (
        <div className="border-2 border-softGold bg-warmWhite p-6 shadow-editorial">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-montserrat text-xs uppercase tracking-editorial text-softGold">
                <KeyRound className="h-4 w-4 shrink-0" />
                <span>New Invitation Code Issued (Copy Now — Stored as HMAC-SHA256 Digest)</span>
              </div>
              <p className="mt-2 font-cormorant text-2xl text-charcoal break-words">
                {issuedCodeBanner.householdName}:{' '}
                <strong className="font-montserrat text-lg tracking-widest bg-ivory border border-editorialBorder px-3 py-1 break-all">
                  {issuedCodeBanner.code}
                </strong>
              </p>
              <p className="mt-1.5 font-montserrat text-xs text-mutedGray break-all">
                Direct Personalized Link:{' '}
                <code className="bg-ivory px-2 py-0.5 text-charcoal break-all">
                  /invite#{issuedCodeBanner.code}
                </code>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `${window.location.origin}/invite#${issuedCodeBanner.code}`
                  );
                }}
                className="inline-flex items-center gap-1.5 border border-charcoal bg-charcoal px-4 py-2 font-montserrat text-xs text-ivory"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Invite Link</span>
              </button>
              <button
                type="button"
                onClick={() => setIssuedCodeBanner(null)}
                className="border border-editorialBorder px-3 py-2 font-montserrat text-xs text-mutedGray"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {!editing && error && (
        <div className="flex items-center gap-2 border border-red-800/30 bg-red-50 px-4 py-2.5 font-montserrat text-xs text-red-900">
          <AlertCircle className="h-4 w-4 text-red-700" />
          <span>{error}</span>
        </div>
      )}

      {/* Create / Edit Household Modal Form */}
      {editing && (
        <form
          onSubmit={handleSaveHousehold}
          className="border border-softGold bg-warmWhite p-6 shadow-editorial space-y-5"
        >
          <h2 className="font-cormorant text-2xl text-charcoal">
            {editing.id
              ? `Edit Household: ${editing.displayName}`
              : 'Create New Household Invitation'}
          </h2>

          {error && (
            <div className="flex items-center gap-2 border border-red-800/30 bg-red-50 px-4 py-2.5 font-montserrat text-xs text-red-900">
              <AlertCircle className="h-4 w-4 text-red-700" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Household Display Name *
              </label>
              <input
                type="text"
                required
                value={editing.displayName}
                onChange={(e) =>
                  setEditing({ ...editing, displayName: e.target.value })
                }
                placeholder="e.g. The Perera Family"
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>

            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Household Category
              </label>
              <select
                value={editing.category}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    category: e.target.value as HouseholdFormState['category'],
                  })
                }
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              >
                <option value="individual">Individual Guest</option>
                <option value="couple">Couple</option>
                <option value="family">Family</option>
                <option value="group">Group / Extended Household</option>
              </select>
            </div>

            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Additional Guest Allowance (+1s)
              </label>
              <input
                type="number"
                min={0}
                max={15}
                value={editing.additionalGuestAllowance}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    additionalGuestAllowance: Number(e.target.value),
                  })
                }
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>
          </div>

          {/* Specifically Invited Household Members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-montserrat text-[11px] uppercase tracking-wider text-charcoal">
                Specifically Invited Household Members ({editing.members.length}) *
              </label>
              <button
                type="button"
                onClick={() =>
                  setEditing({
                    ...editing,
                    members: [...editing.members, { fullName: '' }],
                  })
                }
                className="inline-flex items-center gap-1 border border-charcoal bg-ivory px-3 py-1 font-montserrat text-xs"
              >
                <Plus className="h-3 w-3" /> Add Member
              </button>
            </div>

            <div className="space-y-2">
              {editing.members.map((member, idx) => (
                <div key={member.id || idx} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={member.fullName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditing({
                        ...editing,
                        members: editing.members.map((m, i) =>
                          i === idx ? { ...m, fullName: val } : m
                        ),
                      });
                    }}
                    placeholder={`Invited Member #${idx + 1} Full Name (e.g. Mr. Perera)`}
                    className="flex-1 border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
                  />
                  {editing.members.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          members: editing.members.filter((_, i) => i !== idx),
                        })
                      }
                      className="border border-editorialBorder px-3 py-2 text-red-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Optional Custom Invitation Code (Leave blank to auto-generate CSPRNG code)
              </label>
              <input
                type="text"
                value={editing.customPlaintextCode}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    customPlaintextCode: e.target.value.toUpperCase(),
                  })
                }
                placeholder="Auto-generated if left blank"
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs uppercase"
              />
            </div>

            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Admin Notes (Private — Never shown to guests)
              </label>
              <input
                type="text"
                value={editing.adminNotes}
                onChange={(e) =>
                  setEditing({ ...editing, adminNotes: e.target.value })
                }
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="border border-editorialBorder px-4 py-2 font-montserrat text-xs text-mutedGray"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="border border-charcoal bg-charcoal px-6 py-2 font-montserrat text-xs uppercase tracking-wider text-ivory"
            >
              {saving ? 'Saving...' : 'Save Household Invitation'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-mutedGray absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by household name or invited member name..."
            className="w-full border border-editorialBorder bg-warmWhite pl-10 pr-4 py-2.5 font-montserrat text-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-editorialBorder bg-warmWhite px-4 py-2.5 font-montserrat text-xs"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Invitations</option>
          <option value="revoked">Revoked Invitations</option>
          <option value="inactive">Inactive Invitations</option>
        </select>
      </div>

      {/* Households List */}
      <div className="space-y-4">
        {filtered.map((hh) => (
          <div
            key={hh.id}
            className="border border-editorialBorder bg-warmWhite p-5 shadow-card flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="font-cormorant text-2xl font-medium text-charcoal">
                  {hh.displayName}
                </h3>
                <span
                  className={`font-montserrat text-[10px] uppercase px-2.5 py-0.5 ${
                    hh.status === 'active'
                      ? 'bg-softGold/20 text-charcoal'
                      : 'bg-red-100 text-red-900'
                  }`}
                >
                  {hh.status}
                </span>
                <span className="font-montserrat text-[11px] text-mutedGray border border-editorialBorder bg-ivory px-2 py-0.5">
                  Code Digest Hint: {hh.codeHint}
                </span>
                {hh.devSampleCode && (
                  <span className="font-montserrat text-[11px] text-charcoal bg-softGold/15 border border-softGold/40 px-2 py-0.5">
                    Sample Code: <strong>{hh.devSampleCode}</strong>
                  </span>
                )}
              </div>

              <p className="font-montserrat text-xs text-charcoal">
                <strong>Invited Members ({hh.maxInvitedMembers}):</strong>{' '}
                {hh.members.map((m) => m.fullName).join(' • ')}
              </p>

              <div className="flex flex-wrap items-center gap-4 font-montserrat text-[11px] text-mutedGray">
                <span>+1 Guest Allowance: {hh.additionalGuestAllowance}</span>
                <span>•</span>
                <span>
                  RSVP Status:{' '}
                  <strong className="text-charcoal">
                    {!hh.rsvp
                      ? 'Pending Response'
                      : hh.rsvp.overallStatus === 'attending'
                      ? `Attending (${hh.rsvp.totalAttendingCount} total)`
                      : 'Declined'}
                  </strong>
                </span>
                {hh.adminNotes && (
                  <>
                    <span>•</span>
                    <span>Note: {hh.adminNotes}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setEditing({
                    id: hh.id,
                    displayName: hh.displayName,
                    category: hh.category,
                    members: hh.members,
                    additionalGuestAllowance: hh.additionalGuestAllowance,
                    status: hh.status,
                    adminNotes: hh.adminNotes || '',
                    customPlaintextCode: '',
                  })
                }
                className="inline-flex items-center gap-1 border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs hover:border-softGold"
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit
              </button>

              <button
                type="button"
                onClick={() => handleCodeAction(hh, 'regenerate')}
                className="inline-flex items-center gap-1 border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs hover:border-softGold"
                title="Regenerate new CSPRNG invitation code"
              >
                <RefreshCw className="h-3.5 w-3.5 text-softGold" /> Regenerate Code
              </button>

              {hh.status === 'active' ? (
                <button
                  type="button"
                  onClick={() => handleCodeAction(hh, 'revoke')}
                  className="inline-flex items-center gap-1 border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs text-red-800 hover:bg-red-50"
                >
                  <Ban className="h-3.5 w-3.5" /> Revoke
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCodeAction(hh, 'activate')}
                  className="inline-flex items-center gap-1 border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs text-charcoal"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-softGold" /> Activate
                </button>
              )}

              <button
                type="button"
                onClick={() => handleDeleteHousehold(hh)}
                className="p-2 border border-editorialBorder bg-ivory text-red-800 hover:bg-red-50"
                title="Delete household"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

