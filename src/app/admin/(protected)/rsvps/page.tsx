'use client';

import React, { useEffect, useState } from 'react';
import {
  Download,
  Search,
  Edit3,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
} from 'lucide-react';
import { AdminHouseholdWithRsvpView } from '@/lib/db/repository';
import { MealOption } from '@/lib/types/domain';

export default function AdminRsvpsPage() {
  const [households, setHouseholds] = useState<AdminHouseholdWithRsvpView[]>([]);
  const [mealOptions, setMealOptions] = useState<MealOption[]>([]);
  const [enableMealPreferencesGlobal, setEnableMealPreferencesGlobal] =
    useState<boolean>(true);
  const [allowAdditionalGuestsGlobal, setAllowAdditionalGuestsGlobal] =
    useState<boolean>(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'attending' | 'declined' | 'pending'
  >('all');
  const [mealFilter, setMealFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'updated' | 'attendees'>('updated');

  // Admin RSVP Edit Modal State
  const [editingHh, setEditingHh] = useState<AdminHouseholdWithRsvpView | null>(
    null
  );
  const [overallStatus, setOverallStatus] = useState<'attending' | 'declined'>(
    'attending'
  );
  const [memberResponses, setMemberResponses] = useState<
    Array<{
      memberId: string;
      memberName: string;
      attending: boolean;
      mealOptionId: string | null;
      dietaryNotes: string;
    }>
  >([]);
  const [additionalGuests, setAdditionalGuests] = useState<
    Array<{
      id: string;
      fullName: string;
      mealOptionId: string | null;
      dietaryNotes: string;
    }>
  >([]);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/rsvps')
      .then((r) => r.json())
      .then((d) => {
        if (d.households) setHouseholds(d.households);
        if (d.mealOptions) setMealOptions(d.mealOptions);
        if (typeof d.enableMealPreferencesGlobal === 'boolean') {
          setEnableMealPreferencesGlobal(d.enableMealPreferencesGlobal);
        }
        if (typeof d.allowAdditionalGuestsGlobal === 'boolean') {
          setAllowAdditionalGuestsGlobal(d.allowAdditionalGuestsGlobal);
        }
      });
  }, []);

  function openEditModal(hh: AdminHouseholdWithRsvpView) {
    setEditingHh(hh);
    setEditError(null);
    const defaultMeal = enableMealPreferencesGlobal
      ? mealOptions[0]?.id || null
      : null;
    if (hh.rsvp) {
      setOverallStatus(hh.rsvp.overallStatus);
      setMemberResponses(
        hh.members.map((m) => {
          const found = hh.rsvp?.memberResponses.find(
            (r) => r.memberId === m.id
          );
          return {
            memberId: m.id,
            memberName: m.fullName,
            attending: found ? found.attending : false,
            mealOptionId: enableMealPreferencesGlobal
              ? found?.mealOptionId || defaultMeal
              : null,
            dietaryNotes: found?.dietaryNotes || '',
          };
        })
      );
      setAdditionalGuests(
        (hh.rsvp.additionalGuests || []).map((ag) => ({
          id: ag.id,
          fullName: ag.fullName,
          mealOptionId: enableMealPreferencesGlobal
            ? ag.mealOptionId || defaultMeal
            : null,
          dietaryNotes: ag.dietaryNotes || '',
        }))
      );
      setContactEmail(hh.rsvp.contactEmail || '');
      setContactPhone(hh.rsvp.contactPhone || '');
      setPersonalMessage(hh.rsvp.personalMessage || '');
    } else {
      setOverallStatus('attending');
      setMemberResponses(
        hh.members.map((m) => ({
          memberId: m.id,
          memberName: m.fullName,
          attending: true,
          mealOptionId: defaultMeal,
          dietaryNotes: '',
        }))
      );
      setAdditionalGuests([]);
      setContactEmail('');
      setContactPhone('');
      setPersonalMessage('');
    }
  }

  async function handleSaveAdminRsvp(e: React.FormEvent) {
    e.preventDefault();
    if (!editingHh) return;
    setSaving(true);
    setEditError(null);
    try {
      const payload = {
        householdId: editingHh.id,
        overallStatus,
        memberResponses: memberResponses.map((m) => ({
          memberId: m.memberId,
          attending: overallStatus === 'declined' ? false : m.attending,
          mealOptionId:
            overallStatus === 'attending' &&
            m.attending &&
            enableMealPreferencesGlobal
              ? m.mealOptionId
              : null,
          dietaryNotes: m.dietaryNotes,
        })),
        additionalGuests:
          overallStatus === 'attending' && allowAdditionalGuestsGlobal
            ? additionalGuests.map((ag) => ({
                ...ag,
                mealOptionId: enableMealPreferencesGlobal
                  ? ag.mealOptionId
                  : null,
              }))
            : [],
        contactEmail,
        contactPhone,
        personalMessage,
      };

      const res = await fetch('/api/admin/rsvps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.households) {
        setHouseholds(data.households);
        setEditingHh(null);
      } else {
        setEditError(data.error || 'Failed to update RSVP record.');
      }
    } finally {
      setSaving(false);
    }
  }

  const mealLabelMap = new Map(mealOptions.map((m) => [m.id, m.label]));

  const filtered = households
    .filter((hh) => hh.status !== 'revoked')
    .filter((hh) => {
      if (statusFilter === 'pending' && hh.rsvp !== null) return false;
      if (
        statusFilter === 'attending' &&
        hh.rsvp?.overallStatus !== 'attending'
      ) {
        return false;
      }
      if (
        statusFilter === 'declined' &&
        hh.rsvp?.overallStatus !== 'declined'
      ) {
        return false;
      }

      if (mealFilter !== 'all') {
        if (!hh.rsvp) return false;
        const hasMealInMembers = hh.rsvp.memberResponses.some(
          (m) => m.attending && m.mealOptionId === mealFilter
        );
        const hasMealInPlusOnes = hh.rsvp.additionalGuests.some(
          (ag) => ag.mealOptionId === mealFilter
        );
        if (!hasMealInMembers && !hasMealInPlusOnes) return false;
      }

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        hh.displayName.toLowerCase().includes(q) ||
        hh.members.some((m) => m.fullName.toLowerCase().includes(q)) ||
        Boolean(
          hh.rsvp?.additionalGuests.some((ag) =>
            ag.fullName.toLowerCase().includes(q)
          )
        )
      );
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.displayName.localeCompare(b.displayName);
      }
      if (sortBy === 'attendees') {
        return (
          (b.rsvp?.totalAttendingCount || 0) -
          (a.rsvp?.totalAttendingCount || 0)
        );
      }
      const dateA = a.rsvp ? Date.parse(a.rsvp.updatedAt) : 0;
      const dateB = b.rsvp ? Date.parse(b.rsvp.updatedAt) : 0;
      return dateB - dateA;
    });

  const finalExpectedAttendance = households
    .filter((h) => h.status !== 'revoked')
    .reduce((sum, h) => sum + (h.rsvp?.totalAttendingCount || 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-editorialBorder pb-5">
        <div>
          <p className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold">
            Guest Responses &amp; Spreadsheet Exports
          </p>
          <h1 className="mt-1 font-cormorant text-3xl sm:text-4xl text-charcoal">
            RSVP Management ({finalExpectedAttendance} Expected Attendees)
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/rsvps/export?format=xlsx"
            className="inline-flex items-center gap-2 border border-charcoal bg-charcoal px-4 py-2.5 font-montserrat text-xs uppercase tracking-wider text-ivory hover:bg-transparent hover:text-charcoal"
          >
            <Download className="h-3.5 w-3.5 text-softGold" />
            <span>Export Excel (.xlsx)</span>
          </a>

          <a
            href="/api/admin/rsvps/export?format=csv"
            className="inline-flex items-center gap-2 border border-editorialBorder bg-warmWhite px-4 py-2.5 font-montserrat text-xs uppercase tracking-wider text-charcoal hover:border-softGold"
          >
            <Download className="h-3.5 w-3.5 text-softGold" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="h-4 w-4 text-mutedGray absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search household or guest name..."
            className="w-full border border-editorialBorder bg-warmWhite pl-10 pr-3 py-2.5 font-montserrat text-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as typeof statusFilter)
          }
          className="border border-editorialBorder bg-warmWhite px-3 py-2.5 font-montserrat text-xs"
        >
          <option value="all">Filter: All RSVP Statuses</option>
          <option value="attending">Attending Only</option>
          <option value="declined">Declined Only</option>
          <option value="pending">Pending Response Only</option>
        </select>

        <select
          value={mealFilter}
          onChange={(e) => setMealFilter(e.target.value)}
          className="border border-editorialBorder bg-warmWhite px-3 py-2.5 font-montserrat text-xs"
        >
          <option value="all">Filter: All Entrée Selections</option>
          {mealOptions.map((m) => (
            <option key={m.id} value={m.id}>
              Entrée: {m.label}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="border border-editorialBorder bg-warmWhite px-3 py-2.5 font-montserrat text-xs"
        >
          <option value="updated">Sort: Recently Updated</option>
          <option value="attendees">Sort: Highest Attendance</option>
          <option value="name">Sort: Household Name (A–Z)</option>
        </select>
      </div>

      {/* Admin Edit RSVP Modal */}
      {editingHh && (
        <form
          onSubmit={handleSaveAdminRsvp}
          className="border-2 border-softGold bg-warmWhite p-6 shadow-editorial space-y-5"
        >
          <div className="flex items-center justify-between border-b border-editorialBorder pb-3">
            <h2 className="font-cormorant text-2xl text-charcoal">
              Admin RSVP Record Editor — {editingHh.displayName}
            </h2>
            <button
              type="button"
              onClick={() => setEditingHh(null)}
              className="font-montserrat text-xs text-mutedGray"
            >
              Close
            </button>
          </div>

          <div className="flex gap-4">
            <label className="inline-flex items-center gap-2 font-montserrat text-xs">
              <input
                type="radio"
                checked={overallStatus === 'attending'}
                onChange={() => setOverallStatus('attending')}
              />
              <span>Attending</span>
            </label>
            <label className="inline-flex items-center gap-2 font-montserrat text-xs">
              <input
                type="radio"
                checked={overallStatus === 'declined'}
                onChange={() => setOverallStatus('declined')}
              />
              <span>Declined</span>
            </label>
          </div>

          <div className="space-y-3">
            {memberResponses.map((mr, idx) => (
              <div
                key={mr.memberId}
                className="border border-editorialBorder bg-ivory p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center"
              >
                <span className="font-montserrat text-xs font-medium">
                  {mr.memberName}
                </span>
                <label className="inline-flex items-center gap-2 font-montserrat text-xs">
                  <input
                    type="checkbox"
                    checked={overallStatus === 'attending' && mr.attending}
                    disabled={overallStatus === 'declined'}
                    onChange={(e) => {
                      const att = e.target.checked;
                      setMemberResponses((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, attending: att } : item
                        )
                      );
                    }}
                  />
                  <span>Attending</span>
                </label>

                {overallStatus === 'attending' && mr.attending && (
                  <div className="flex flex-col sm:flex-row gap-2 sm:col-span-1">
                    {enableMealPreferencesGlobal && mealOptions.length > 0 && (
                      <select
                        value={mr.mealOptionId || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMemberResponses((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, mealOptionId: val } : item
                            )
                          );
                        }}
                        className="border border-editorialBorder bg-warmWhite px-2.5 py-1.5 font-montserrat text-xs"
                      >
                        {mealOptions.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      type="text"
                      value={mr.dietaryNotes}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMemberResponses((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, dietaryNotes: val } : item
                          )
                        );
                      }}
                      placeholder="Dietary notes"
                      className="border border-editorialBorder bg-warmWhite px-2.5 py-1.5 font-montserrat text-xs"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {overallStatus === 'attending' &&
            allowAdditionalGuestsGlobal &&
            editingHh.additionalGuestAllowance > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-montserrat text-xs uppercase tracking-wider">
                    Additional Guests (Max {editingHh.additionalGuestAllowance})
                  </span>
                  {additionalGuests.length <
                    editingHh.additionalGuestAllowance && (
                    <button
                      type="button"
                      onClick={() =>
                        setAdditionalGuests((prev) => [
                          ...prev,
                          {
                            id: `plus_adm_${Date.now()}`,
                            fullName: '',
                            mealOptionId: enableMealPreferencesGlobal
                              ? mealOptions[0]?.id || null
                              : null,
                            dietaryNotes: '',
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1 border border-charcoal bg-ivory px-2.5 py-1 font-montserrat text-xs"
                    >
                      <Plus className="h-3 w-3" /> Add +1
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {additionalGuests.map((ag, idx) => (
                    <div key={ag.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <input
                        type="text"
                        required
                        value={ag.fullName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAdditionalGuests((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, fullName: val } : item
                            )
                          );
                        }}
                        placeholder="Additional guest full name"
                        className="sm:col-span-4 border border-editorialBorder bg-ivory px-3 py-1.5 font-montserrat text-xs"
                      />
                      {enableMealPreferencesGlobal && mealOptions.length > 0 && (
                        <select
                          value={ag.mealOptionId || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAdditionalGuests((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, mealOptionId: val } : item
                              )
                            );
                          }}
                          className="sm:col-span-4 border border-editorialBorder bg-ivory px-2.5 py-1.5 font-montserrat text-xs"
                        >
                          {mealOptions.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        type="text"
                        value={ag.dietaryNotes}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAdditionalGuests((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, dietaryNotes: val } : item
                            )
                          );
                        }}
                        placeholder="Dietary notes"
                        className="sm:col-span-3 border border-editorialBorder bg-ivory px-2.5 py-1.5 font-montserrat text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setAdditionalGuests((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="sm:col-span-1 flex items-center justify-center border border-editorialBorder px-2 py-1.5 text-red-800"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {editError && (
            <div className="border border-red-800/30 bg-red-50/70 px-4 py-2.5 font-montserrat text-xs text-red-900">
              {editError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-editorialBorder">
            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
                Household Contact Email (Optional)
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="guest@example.com"
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>

            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
                Household Contact Phone (Optional)
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+94 77 000 0000"
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Personal Message / Wishes for the Couple (Optional)
            </label>
            <textarea
              rows={2}
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              className="w-full border border-editorialBorder bg-ivory p-3 font-montserrat text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditingHh(null)}
              className="border border-editorialBorder px-4 py-2 font-montserrat text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="border border-charcoal bg-charcoal px-6 py-2 font-montserrat text-xs uppercase tracking-wider text-ivory"
            >
              {saving ? 'Saving...' : 'Save RSVP Record'}
            </button>
          </div>
        </form>
      )}

      {/* Detailed Household RSVP Cards */}
      <div className="space-y-4">
        {filtered.map((hh) => {
          const rsvp = hh.rsvp;
          return (
            <div
              key={hh.id}
              className="border border-editorialBorder bg-warmWhite p-5 shadow-card space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-editorialBorder pb-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-cormorant text-2xl font-medium text-charcoal">
                      {hh.displayName}
                    </h3>
                    {!rsvp ? (
                      <span className="inline-flex items-center gap-1 bg-ivory border border-editorialBorder px-2.5 py-0.5 font-montserrat text-[10px] uppercase text-mutedGray">
                        <Clock className="h-3 w-3" /> Pending
                      </span>
                    ) : rsvp.overallStatus === 'attending' ? (
                      <span className="inline-flex items-center gap-1 bg-softGold/20 px-2.5 py-0.5 font-montserrat text-[10px] uppercase text-charcoal">
                        <CheckCircle2 className="h-3 w-3 text-softGold" /> Attending (
                        {rsvp.totalAttendingCount})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-charcoal/10 px-2.5 py-0.5 font-montserrat text-[10px] uppercase text-mutedGray">
                        <XCircle className="h-3 w-3" /> Declined
                      </span>
                    )}
                  </div>
                  {rsvp && (
                    <p className="mt-1 font-montserrat text-[11px] text-mutedGray">
                      Submitted: {new Date(rsvp.submittedAt).toLocaleDateString()} • Last Updated:{' '}
                      {new Date(rsvp.updatedAt).toLocaleString()}
                      {rsvp.contactEmail ? ` • ${rsvp.contactEmail}` : ''}
                      {rsvp.contactPhone ? ` • ${rsvp.contactPhone}` : ''}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => openEditModal(hh)}
                  className="self-start inline-flex items-center gap-1.5 border border-editorialBorder bg-ivory px-3.5 py-2 font-montserrat text-xs text-charcoal hover:border-softGold"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>{rsvp ? 'Edit / Correct RSVP' : 'Record RSVP'}</span>
                </button>
              </div>

              {/* Member Roster Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-montserrat text-xs">
                {hh.members.map((m) => {
                  const mr = rsvp?.memberResponses.find(
                    (r) => r.memberId === m.id
                  );
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between border border-editorialBorder bg-ivory/60 px-3 py-2"
                    >
                      <span className="font-medium text-charcoal">{m.fullName}</span>
                      <span className="text-mutedGray">
                        {!rsvp
                          ? 'Pending'
                          : mr?.attending
                          ? `Attending${
                              mr.mealOptionId
                                ? ` • ${mealLabelMap.get(mr.mealOptionId) || mr.mealOptionId}`
                                : ''
                            }`
                          : 'Unable to Attend'}
                      </span>
                    </div>
                  );
                })}

                {rsvp?.additionalGuests.map((ag) => (
                  <div
                    key={ag.id}
                    className="flex items-center justify-between border border-softGold/40 bg-ivory px-3 py-2"
                  >
                    <span className="font-medium text-charcoal">
                      {ag.fullName} (+1 Guest)
                    </span>
                    <span className="text-mutedGray">
                      Attending
                      {ag.mealOptionId
                        ? ` • ${mealLabelMap.get(ag.mealOptionId) || ag.mealOptionId}`
                        : ''}
                    </span>
                  </div>
                ))}
              </div>

              {rsvp?.personalMessage && (
                <div className="border-t border-editorialBorder pt-3 font-cormorant italic text-lg text-charcoal">
                  “{rsvp.personalMessage}”
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

