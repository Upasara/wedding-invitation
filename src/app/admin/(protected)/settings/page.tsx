'use client';

import React, { useEffect, useState } from 'react';
import {
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { MealOption, WeddingSettings } from '@/lib/types/domain';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<WeddingSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Admin Account State
  const [displayName, setDisplayName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings').then((r) => r.json()),
      fetch('/api/admin/auth/me').then((r) => r.json()),
    ]).then(([settingsData, meData]) => {
      if (settingsData.settings) setSettings(settingsData.settings);
      if (meData.admin) {
        setDisplayName(meData.admin.displayName || '');
        setPhotoUrl(meData.admin.photoUrl || '');
      }
    });
  }, []);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    setFeedback(null);

    try {
      const payload = {
        rsvpEnabled: settings.rsvpEnabled,
        rsvpDeadline: settings.rsvpDeadline,
        rsvpInstructions: settings.rsvpInstructions,
        allowAdditionalGuestsGlobal: settings.allowAdditionalGuestsGlobal,
        enableMealPreferencesGlobal: settings.enableMealPreferencesGlobal,
        mealOptions: settings.mealOptions,
        requireInvitationCode: settings.requireInvitationCode,
        invitationAccessOpen: settings.invitationAccessOpen,
        turnstileEnabled: settings.turnstileEnabled,
        sectionVisibility: settings.sectionVisibility,
      };

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to update settings.',
        });
        return;
      }
      setSettings(data.settings);
      setFeedback({
        type: 'success',
        message: 'Wedding & RSVP settings saved successfully.',
      });
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    setSavingAccount(true);
    setFeedback(null);
    try {
      const payload: Record<string, string> = { displayName, photoUrl };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch('/api/admin/auth/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to update administrator account.',
        });
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setFeedback({
        type: 'success',
        message: 'Administrator account updated.',
      });
    } finally {
      setSavingAccount(false);
    }
  }

  if (!settings) {
    return (
      <div className="py-12 font-montserrat text-xs uppercase tracking-editorial text-mutedGray">
        Loading platform settings...
      </div>
    );
  }

  const addMealOption = () => {
    const nextMeal: MealOption = {
      id: `meal_${Date.now()}`,
      label: 'New Entrée Option',
      description: ' Entrée description',
      dietaryTag: '',
      active: true,
    };
    setSettings({
      ...settings,
      mealOptions: [...settings.mealOptions, nextMeal],
    });
  };

  return (
    <div className="space-y-10">
      <div className="border-b border-editorialBorder pb-5">
        <p className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold">
          System &amp; Security Controls
        </p>
        <h1 className="mt-1 font-cormorant text-3xl sm:text-4xl text-charcoal">
          Platform Settings
        </h1>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2.5 border px-4 py-3 font-montserrat text-xs ${
            feedback.type === 'success'
              ? 'border-softGold bg-warmWhite text-charcoal'
              : 'border-red-800/40 bg-red-50 text-red-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-softGold" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-700" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* 1. RSVP Settings */}
        <div className="border border-editorialBorder bg-warmWhite p-6 shadow-card space-y-5">
          <h2 className="font-cormorant text-2xl text-charcoal border-b border-editorialBorder pb-2">
            1. RSVP Rules &amp; Meal Options
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-montserrat text-xs">
            <label className="flex items-center gap-2.5 border border-editorialBorder bg-ivory p-3.5">
              <input
                type="checkbox"
                checked={settings.rsvpEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, rsvpEnabled: e.target.checked })
                }
              />
              <span>Enable RSVP Submissions</span>
            </label>

            <label className="flex items-center gap-2.5 border border-editorialBorder bg-ivory p-3.5">
              <input
                type="checkbox"
                checked={settings.allowAdditionalGuestsGlobal}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    allowAdditionalGuestsGlobal: e.target.checked,
                  })
                }
              />
              <span>Allow Additional Guests (+1s) Globally</span>
            </label>

            <label className="flex items-center gap-2.5 border border-editorialBorder bg-ivory p-3.5">
              <input
                type="checkbox"
                checked={settings.enableMealPreferencesGlobal}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    enableMealPreferencesGlobal: e.target.checked,
                  })
                }
              />
              <span>Enable Meal Preferences Globally</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                RSVP Deadline (ISO 8601 Date-Time)
              </label>
              <input
                type="text"
                value={settings.rsvpDeadline}
                onChange={(e) =>
                  setSettings({ ...settings, rsvpDeadline: e.target.value })
                }
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>

            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                General RSVP Instructions
              </label>
              <input
                type="text"
                value={settings.rsvpInstructions}
                onChange={(e) =>
                  setSettings({ ...settings, rsvpInstructions: e.target.value })
                }
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>
          </div>

          {/* Meal Options Editor */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <label className="font-montserrat text-xs uppercase tracking-wider text-charcoal">
                Configured Entrée / Meal Options ({settings.mealOptions.length})
              </label>
              <button
                type="button"
                onClick={addMealOption}
                className="inline-flex items-center gap-1 border border-charcoal bg-ivory px-3 py-1.5 font-montserrat text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add Entrée Option
              </button>
            </div>

            <div className="space-y-3">
              {settings.mealOptions.map((meal, idx) => (
                <div
                  key={meal.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center border border-editorialBorder bg-ivory p-3"
                >
                  <input
                    type="text"
                    value={meal.label}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings({
                        ...settings,
                        mealOptions: settings.mealOptions.map((m, i) =>
                          i === idx ? { ...m, label: val } : m
                        ),
                      });
                    }}
                    placeholder="Meal Name"
                    className="sm:col-span-4 border border-editorialBorder bg-warmWhite px-2.5 py-1.5 font-montserrat text-xs"
                  />
                  <input
                    type="text"
                    value={meal.description}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings({
                        ...settings,
                        mealOptions: settings.mealOptions.map((m, i) =>
                          i === idx ? { ...m, description: val } : m
                        ),
                      });
                    }}
                    placeholder="Description"
                    className="sm:col-span-5 border border-editorialBorder bg-warmWhite px-2.5 py-1.5 font-montserrat text-xs"
                  />
                  <input
                    type="text"
                    value={meal.dietaryTag || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings({
                        ...settings,
                        mealOptions: settings.mealOptions.map((m, i) =>
                          i === idx ? { ...m, dietaryTag: val } : m
                        ),
                      });
                    }}
                    placeholder="Dietary Tag"
                    className="sm:col-span-2 border border-editorialBorder bg-warmWhite px-2.5 py-1.5 font-montserrat text-xs"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        mealOptions: settings.mealOptions.filter(
                          (_, i) => i !== idx
                        ),
                      })
                    }
                    className="sm:col-span-1 flex justify-center p-1.5 text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Invitation Access & Public Section Visibility */}
        <div className="border border-editorialBorder bg-warmWhite p-6 shadow-card space-y-5">
          <h2 className="font-cormorant text-2xl text-charcoal border-b border-editorialBorder pb-2">
            2. Invitation Access &amp; Public Section Visibility
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-montserrat text-xs">
            <label className="flex items-center gap-2.5 border border-editorialBorder bg-ivory p-3.5">
              <input
                type="checkbox"
                checked={settings.invitationAccessOpen}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    invitationAccessOpen: e.target.checked,
                  })
                }
              />
              <span>Invitation Portal Open</span>
            </label>

            <label className="flex items-center gap-2.5 border border-editorialBorder bg-ivory p-3.5">
              <input
                type="checkbox"
                checked={settings.requireInvitationCode}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    requireInvitationCode: e.target.checked,
                  })
                }
              />
              <span>Require Household Invitation Code for RSVP</span>
            </label>

            <label className="flex items-center gap-2.5 border border-editorialBorder bg-ivory p-3.5">
              <input
                type="checkbox"
                checked={settings.turnstileEnabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    turnstileEnabled: e.target.checked,
                  })
                }
              />
              <span>Enable Cloudflare Turnstile Challenge</span>
            </label>
          </div>

          <div>
            <p className="font-montserrat text-xs uppercase tracking-wider text-charcoal mb-3">
              Enable / Disable Individual Public Invitation Sections
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-montserrat text-xs">
              {(
                [
                  ['hero', 'Hero & Countdown'],
                  ['invitationMessage', 'Formal Invitation Message'],
                  ['story', 'Our Story'],
                  ['events', 'Wedding Events'],
                  ['gallery', 'Photo Gallery'],
                  ['weddingParty', 'Wedding Party'],
                  ['rsvp', 'RSVP Section'],
                  ['faq', 'Q&A (FAQ) Section'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 border border-editorialBorder bg-ivory p-3"
                >
                  <input
                    type="checkbox"
                    checked={settings.sectionVisibility[key]}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        sectionVisibility: {
                          ...settings.sectionVisibility,
                          [key]: e.target.checked,
                        },
                      })
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="inline-flex items-center gap-2 border border-charcoal bg-charcoal px-6 py-3 font-montserrat text-xs uppercase tracking-editorial text-ivory"
            >
              <Save className="h-4 w-4 text-softGold" />
              <span>
                {savingSettings ? 'Saving Settings...' : 'Save Platform Settings'}
              </span>
            </button>
          </div>
        </div>
      </form>

      {/* 3. Administrator Account & Password Settings */}
      <form
        onSubmit={handleSaveAccount}
        className="border border-editorialBorder bg-warmWhite p-6 shadow-card space-y-5"
      >
        <div className="flex items-center gap-2 border-b border-editorialBorder pb-2">
          <Lock className="h-4 w-4 text-softGold" />
          <h2 className="font-cormorant text-2xl text-charcoal">
            3. Administrator Profile &amp; Security Credentials
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
              Administrator Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>

          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
              Profile Photo URL (Optional)
            </label>
            <input
              type="text"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="/uploads/profile.jpg"
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>

          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
              Current Password (Required to change password)
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>

          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
              New Password (Min 10 characters)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingAccount}
            className="inline-flex items-center gap-2 border border-charcoal bg-charcoal px-6 py-2.5 font-montserrat text-xs uppercase tracking-editorial text-ivory"
          >
            <Save className="h-4 w-4 text-softGold" />
            <span>
              {savingAccount ? 'Updating Account...' : 'Update Admin Account'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}

