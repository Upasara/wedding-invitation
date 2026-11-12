'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  UserPlus,
  Utensils,
  RefreshCw,
  ArrowRight,
  Home,
} from 'lucide-react';
import { DashboardOverviewStats } from '@/lib/types/domain';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<DashboardOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview');
      const data = await res.json();
      if (res.ok && data.stats) {
        setStats(data.stats);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="py-16 text-center font-montserrat text-xs uppercase tracking-editorial text-mutedGray">
        Loading real-time wedding attendance analytics...
      </div>
    );
  }

  const totalInvited = Math.max(1, stats.totalInvitedMembers);
  const attendingPct = Math.round((stats.attendingInvitedMembers / totalInvited) * 100);
  const declinedPct = Math.round((stats.declinedInvitedMembers / totalInvited) * 100);
  const pendingPct = Math.max(0, 100 - attendingPct - declinedPct);

  const totalMeals = Math.max(
    1,
    stats.mealBreakdown.reduce((acc, m) => acc + m.count, 0)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-editorialBorder pb-5">
        <div>
          <p className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold">
            Real-Time Organizer Intelligence
          </p>
          <h1 className="mt-1 font-cormorant text-3xl sm:text-4xl text-charcoal">
            Executive Overview
          </h1>
        </div>

        <button
          type="button"
          onClick={fetchStats}
          className="self-start inline-flex items-center gap-2 border border-editorialBorder bg-warmWhite px-4 py-2 font-montserrat text-xs text-charcoal hover:border-softGold"
        >
          <RefreshCw className="h-3.5 w-3.5 text-softGold" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-softGold/50 bg-warmWhite p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="font-montserrat text-[10px] uppercase tracking-editorial text-mutedGray">
              Total Expected Attendees
            </span>
            <Users className="h-4 w-4 text-softGold" />
          </div>
          <p className="mt-3 font-cormorant text-4xl font-medium text-charcoal">
            {stats.totalExpectedAttendees}
          </p>
          <p className="mt-1 font-montserrat text-[11px] text-mutedGray">
            {stats.attendingInvitedMembers} invited + {stats.totalAdditionalGuests} additional
          </p>
        </div>

        <div className="border border-editorialBorder bg-warmWhite p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="font-montserrat text-[10px] uppercase tracking-editorial text-mutedGray">
              Invitation Households
            </span>
            <Home className="h-4 w-4 text-softGold" />
          </div>
          <p className="mt-3 font-cormorant text-4xl font-medium text-charcoal">
            {stats.totalHouseholds}
          </p>
          <p className="mt-1 font-montserrat text-[11px] text-mutedGray">
            {stats.respondedHouseholds} responded • {stats.pendingHouseholds} pending
          </p>
        </div>

        <div className="border border-editorialBorder bg-warmWhite p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="font-montserrat text-[10px] uppercase tracking-editorial text-mutedGray">
              Invited Roster Breakdown
            </span>
            <CheckCircle2 className="h-4 w-4 text-softGold" />
          </div>
          <p className="mt-3 font-cormorant text-4xl font-medium text-charcoal">
            {stats.totalInvitedMembers}
          </p>
          <p className="mt-1 font-montserrat text-[11px] text-mutedGray">
            {stats.attendingInvitedMembers} attending • {stats.declinedInvitedMembers} declined
          </p>
        </div>

        <div className="border border-editorialBorder bg-warmWhite p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="font-montserrat text-[10px] uppercase tracking-editorial text-mutedGray">
              Pending Member Responses
            </span>
            <Clock className="h-4 w-4 text-softGold" />
          </div>
          <p className="mt-3 font-cormorant text-4xl font-medium text-charcoal">
            {stats.pendingInvitedMembers}
          </p>
          <p className="mt-1 font-montserrat text-[11px] text-mutedGray">
            Plus {stats.totalAdditionalGuests} confirmed +1 guest(s)
          </p>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Guest Attendance Distribution */}
        <div className="border border-editorialBorder bg-warmWhite p-6 shadow-card">
          <h2 className="font-cormorant text-2xl text-charcoal">
            Invited Guest Response Distribution
          </h2>
          <p className="mt-1 font-montserrat text-xs text-mutedGray">
            Live proportion across {stats.totalInvitedMembers} specifically invited household members
          </p>

          {/* Stacked Proportion Bar */}
          <div className="mt-6 h-5 w-full overflow-hidden bg-ivory border border-editorialBorder flex">
            <div
              style={{ width: `${attendingPct}%` }}
              className="bg-charcoal transition-all duration-500"
              title={`Attending: ${stats.attendingInvitedMembers}`}
            />
            <div
              style={{ width: `${declinedPct}%` }}
              className="bg-softGold transition-all duration-500"
              title={`Declined: ${stats.declinedInvitedMembers}`}
            />
            <div
              style={{ width: `${pendingPct}%` }}
              className="bg-editorialBorder transition-all duration-500"
              title={`Pending: ${stats.pendingInvitedMembers}`}
            />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 font-montserrat text-xs">
            <div className="border border-editorialBorder bg-ivory/60 p-3">
              <div className="flex items-center gap-1.5 text-charcoal font-medium">
                <span className="h-2.5 w-2.5 bg-charcoal inline-block" />
                <span>Attending</span>
              </div>
              <p className="mt-1 font-cormorant text-2xl text-charcoal">
                {stats.attendingInvitedMembers}{' '}
                <span className="font-montserrat text-[11px] text-mutedGray">
                  ({attendingPct}%)
                </span>
              </p>
            </div>

            <div className="border border-editorialBorder bg-ivory/60 p-3">
              <div className="flex items-center gap-1.5 text-charcoal font-medium">
                <span className="h-2.5 w-2.5 bg-softGold inline-block" />
                <span>Declined</span>
              </div>
              <p className="mt-1 font-cormorant text-2xl text-charcoal">
                {stats.declinedInvitedMembers}{' '}
                <span className="font-montserrat text-[11px] text-mutedGray">
                  ({declinedPct}%)
                </span>
              </p>
            </div>

            <div className="border border-editorialBorder bg-ivory/60 p-3">
              <div className="flex items-center gap-1.5 text-charcoal font-medium">
                <span className="h-2.5 w-2.5 bg-editorialBorder inline-block" />
                <span>Pending</span>
              </div>
              <p className="mt-1 font-cormorant text-2xl text-charcoal">
                {stats.pendingInvitedMembers}{' '}
                <span className="font-montserrat text-[11px] text-mutedGray">
                  ({pendingPct}%)
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Chart 2: Meal Preference Breakdown */}
        <div className="border border-editorialBorder bg-warmWhite p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-cormorant text-2xl text-charcoal">
                Entrée &amp; Meal Preference Breakdown
              </h2>
              <p className="mt-1 font-montserrat text-xs text-mutedGray">
                Includes attending household members and confirmed +1 guests
              </p>
            </div>
            <Utensils className="h-4 w-4 text-softGold" />
          </div>

          <div className="mt-6 space-y-4">
            {stats.mealBreakdown.map((meal) => {
              const pct = Math.round((meal.count / totalMeals) * 100);
              return (
                <div key={meal.optionId}>
                  <div className="flex items-center justify-between font-montserrat text-xs mb-1.5">
                    <span className="font-medium text-charcoal">{meal.label}</span>
                    <span className="text-mutedGray">
                      {meal.count} guest(s) ({meal.count > 0 ? pct : 0}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-ivory border border-editorialBorder overflow-hidden">
                    <div
                      style={{ width: `${meal.count > 0 ? pct : 0}%` }}
                      className="h-full bg-softGold transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent RSVP Activity */}
      <div className="border border-editorialBorder bg-warmWhite p-6 shadow-card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-cormorant text-2xl text-charcoal">
              Recent RSVP Submissions &amp; Updates
            </h2>
            <p className="font-montserrat text-xs text-mutedGray">
              Latest household responses recorded in the database
            </p>
          </div>
          <Link
            href="/admin/rsvps"
            className="inline-flex items-center gap-1.5 font-montserrat text-xs uppercase tracking-wider text-softGold hover:text-charcoal"
          >
            <span>Manage All RSVPs</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-editorialBorder">
          {stats.recentRsvps.length === 0 ? (
            <p className="py-6 font-montserrat text-xs text-mutedGray">
              No RSVP submissions recorded yet.
            </p>
          ) : (
            stats.recentRsvps.map((item) => (
              <div
                key={item.householdId}
                className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-cormorant text-xl font-medium text-charcoal">
                      {item.householdDisplayName}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 font-montserrat text-[10px] uppercase tracking-wider ${
                        item.overallStatus === 'attending'
                          ? 'bg-softGold/20 text-charcoal'
                          : 'bg-charcoal/10 text-mutedGray'
                      }`}
                    >
                      {item.overallStatus === 'attending' ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-softGold" /> Attending (
                          {item.totalAttendingCount})
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 text-mutedGray" /> Declined
                        </>
                      )}
                    </span>
                  </div>
                  {item.personalMessage && (
                    <p className="mt-1 font-cormorant italic text-base text-mutedGray">
                      “{item.personalMessage}”
                    </p>
                  )}
                </div>

                <div className="font-montserrat text-[11px] text-mutedGray sm:text-right">
                  <div>{new Date(item.updatedAt).toLocaleString()}</div>
                  <div className="uppercase text-[10px]">
                    Updated by {item.updatedBy}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

