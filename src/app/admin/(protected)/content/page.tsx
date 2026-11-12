'use client';

import React, { useEffect, useState } from 'react';
import { Save, Upload, CheckCircle2, AlertCircle, Music, Trash2 } from 'lucide-react';
import { WeddingContent } from '@/lib/types/domain';

export default function AdminWeddingContentPage() {
  const [content, setContent] = useState<WeddingContent | null>(null);
  const [hostsText, setHostsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/admin/content')
      .then((r) => r.json())
      .then((data) => {
        if (data.content) {
          setContent(data.content);
          setHostsText((data.content.hostNames || []).join('\n'));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleFileUpload(
    file: File,
    mediaType: 'image' | 'audio',
    onUrl: (url: string) => void,
    fieldKey: string
  ) {
    setUploadingField(fieldKey);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mediaType', mediaType);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setFeedback({
          type: 'error',
          message: data.error || 'File upload failed.',
        });
        return;
      }
      onUrl(data.url);
      setFeedback({
        type: 'success',
        message: 'Media uploaded! Click "Save All Content Changes" to publish.',
      });
    } catch {
      setFeedback({ type: 'error', message: 'Upload failed.' });
    } finally {
      setUploadingField(null);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!content) return;
    setSaving(true);
    setFeedback(null);

    try {
      const hostNames = hostsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        isPlaceholderContent: content.isPlaceholderContent,
        coupleNames: content.coupleNames,
        weddingDateIso: content.weddingDateIso,
        weddingTimezone: content.weddingTimezone,
        weddingDateDisplay: content.weddingDateDisplay,
        weddingLocationSummary: content.weddingLocationSummary,
        coverPhrase: content.coverPhrase,
        coverSubtext: content.coverSubtext,
        heroTagline: content.heroTagline,
        heroImageUrl: content.heroImageUrl,
        couplePhotoOneUrl: content.couplePhotoOneUrl,
        couplePhotoTwoUrl: content.couplePhotoTwoUrl,
        partnerOneBio: content.partnerOneBio,
        partnerTwoBio: content.partnerTwoBio,
        invitationHeading: content.invitationHeading,
        hostNames,
        invitationMessageBody: content.invitationMessageBody,
        invitationAdditionalText: content.invitationAdditionalText,
        storySectionTitle: content.storySectionTitle,
        storySectionSubtitle: content.storySectionSubtitle,
        storyIntroText: content.storyIntroText,
        countdownHeading: content.countdownHeading,
        postWeddingMessage: content.postWeddingMessage,
        audioUrl: content.audioUrl,
        audioTitle: content.audioTitle,
        footerClosingMessage: content.footerClosingMessage,
        footerCopyright: content.footerCopyright,
      };

      const res = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to save wedding content.',
        });
        return;
      }
      setContent(data.content);
      setFeedback({
        type: 'success',
        message: 'Wedding content updated and published to the public invitation.',
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Network error while saving content.',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !content) {
    return (
      <div className="py-12 font-montserrat text-xs uppercase tracking-editorial text-mutedGray">
        Loading wedding content configuration...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-editorialBorder pb-5">
        <div>
          <p className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold">
            Editorial Content Management
          </p>
          <h1 className="mt-1 font-cormorant text-3xl sm:text-4xl text-charcoal">
            Wedding Invitation Content
          </h1>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 border border-charcoal bg-charcoal px-6 py-3 font-montserrat text-xs uppercase tracking-editorial text-ivory hover:bg-transparent hover:text-charcoal transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4 text-softGold" />
          <span>{saving ? 'Saving...' : 'Save All Content Changes'}</span>
        </button>
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
            <CheckCircle2 className="h-4 w-4 text-softGold shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-700 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 1. Couple Names & Date */}
      <div className="border border-editorialBorder bg-warmWhite p-6 shadow-card space-y-5">
        <h2 className="font-cormorant text-2xl text-charcoal border-b border-editorialBorder pb-2">
          1. Couple Identity, Date &amp; Countdown
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Partner One Name
            </label>
            <input
              type="text"
              value={content.coupleNames.partnerOne}
              onChange={(e) =>
                setContent({
                  ...content,
                  coupleNames: { ...content.coupleNames, partnerOne: e.target.value },
                })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>

          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Partner Two Name
            </label>
            <input
              type="text"
              value={content.coupleNames.partnerTwo}
              onChange={(e) =>
                setContent({
                  ...content,
                  coupleNames: { ...content.coupleNames, partnerTwo: e.target.value },
                })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>

          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Display Title
            </label>
            <input
              type="text"
              value={content.coupleNames.displayTitle}
              onChange={(e) =>
                setContent({
                  ...content,
                  coupleNames: { ...content.coupleNames, displayTitle: e.target.value },
                })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>

          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Monogram Crest
            </label>
            <input
              type="text"
              value={content.coupleNames.monogram}
              onChange={(e) =>
                setContent({
                  ...content,
                  coupleNames: { ...content.coupleNames, monogram: e.target.value },
                })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Wedding Date &amp; Time (ISO 8601)
            </label>
            <input
              type="text"
              value={content.weddingDateIso}
              onChange={(e) =>
                setContent({ ...content, weddingDateIso: e.target.value })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>

          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Formatted Date Display
            </label>
            <input
              type="text"
              value={content.weddingDateDisplay}
              onChange={(e) =>
                setContent({ ...content, weddingDateDisplay: e.target.value })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>

          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Location Summary
            </label>
            <input
              type="text"
              value={content.weddingLocationSummary}
              onChange={(e) =>
                setContent({ ...content, weddingLocationSummary: e.target.value })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Countdown Heading
            </label>
            <input
              type="text"
              value={content.countdownHeading}
              onChange={(e) =>
                setContent({ ...content, countdownHeading: e.target.value })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>

          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Post-Wedding Message (Shown after wedding date passes)
            </label>
            <input
              type="text"
              value={content.postWeddingMessage}
              onChange={(e) =>
                setContent({ ...content, postWeddingMessage: e.target.value })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>
        </div>

        <div className="pt-2">
          <label className="inline-flex items-center gap-2.5 border border-editorialBorder bg-ivory px-3.5 py-2.5 font-montserrat text-xs text-charcoal">
            <input
              type="checkbox"
              checked={Boolean(content.isPlaceholderContent)}
              onChange={(e) =>
                setContent({
                  ...content,
                  isPlaceholderContent: e.target.checked,
                })
              }
            />
            <span>
              Mark current text &amp; assets as initial placeholder content (uncheck once finalized for client launch)
            </span>
          </label>
        </div>
      </div>

      {/* 2. Opening Cover & Hero Image */}
      <div className="border border-editorialBorder bg-warmWhite p-6 shadow-card space-y-5">
        <h2 className="font-cormorant text-2xl text-charcoal border-b border-editorialBorder pb-2">
          2. Opening Cover &amp; Hero Photograph
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Opening Cover Phrase
            </label>
            <input
              type="text"
              value={content.coverPhrase}
              onChange={(e) =>
                setContent({ ...content, coverPhrase: e.target.value })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>

          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Opening Cover Subtext
            </label>
            <input
              type="text"
              value={content.coverSubtext}
              onChange={(e) =>
                setContent({ ...content, coverSubtext: e.target.value })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>

          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Hero Section Tagline
            </label>
            <input
              type="text"
              value={content.heroTagline}
              onChange={(e) =>
                setContent({ ...content, heroTagline: e.target.value })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
            Main Hero Photograph URL or Upload
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={content.heroImageUrl}
              onChange={(e) =>
                setContent({ ...content, heroImageUrl: e.target.value })
              }
              className="flex-1 border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
            <label className="cursor-pointer inline-flex items-center justify-center gap-2 border border-charcoal bg-ivory px-4 py-2 font-montserrat text-xs text-charcoal hover:bg-charcoal hover:text-ivory">
              <Upload className="h-3.5 w-3.5" />
              <span>
                {uploadingField === 'hero' ? 'Uploading...' : 'Upload Photograph'}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    handleFileUpload(
                      f,
                      'image',
                      (url) => setContent({ ...content, heroImageUrl: url }),
                      'hero'
                    );
                  }
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* 3. Formal Invitation Message & Hosts */}
      <div className="border border-editorialBorder bg-warmWhite p-6 shadow-card space-y-5">
        <h2 className="font-cormorant text-2xl text-charcoal border-b border-editorialBorder pb-2">
          3. Formal Invitation Message &amp; Hosts
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Invitation Section Heading
            </label>
            <input
              type="text"
              value={content.invitationHeading}
              onChange={(e) =>
                setContent({ ...content, invitationHeading: e.target.value })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>

          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Additional Invitation Line (e.g. Attire / Reception Note)
            </label>
            <input
              type="text"
              value={content.invitationAdditionalText}
              onChange={(e) =>
                setContent({
                  ...content,
                  invitationAdditionalText: e.target.value,
                })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
            Parents / Host Names (One line per host couple/family)
          </label>
          <textarea
            rows={3}
            value={hostsText}
            onChange={(e) => setHostsText(e.target.value)}
            className="w-full border border-editorialBorder bg-ivory p-3 font-montserrat text-xs"
          />
        </div>

        <div>
          <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
            Main Invitation Message Body
          </label>
          <textarea
            rows={4}
            value={content.invitationMessageBody}
            onChange={(e) =>
              setContent({ ...content, invitationMessageBody: e.target.value })
            }
            className="w-full border border-editorialBorder bg-ivory p-3 font-montserrat text-xs"
          />
        </div>
      </div>

      {/* 4. Couple Portraits, Bios & Story Section Header */}
      <div className="border border-editorialBorder bg-warmWhite p-6 shadow-card space-y-5">
        <h2 className="font-cormorant text-2xl text-charcoal border-b border-editorialBorder pb-2">
          4. Couple Portraits, Bios &amp; Story Section Header
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal">
              Partner One Portrait URL &amp; Bio
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={content.couplePhotoOneUrl}
                onChange={(e) =>
                  setContent({ ...content, couplePhotoOneUrl: e.target.value })
                }
                className="flex-1 border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
              <label className="cursor-pointer inline-flex items-center gap-1.5 border border-charcoal bg-ivory px-3 py-2 font-montserrat text-xs text-charcoal hover:bg-charcoal hover:text-ivory">
                <Upload className="h-3.5 w-3.5" />
                <span>
                  {uploadingField === 'partnerOne' ? 'Uploading...' : 'Upload'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      handleFileUpload(
                        f,
                        'image',
                        (url) =>
                          setContent({ ...content, couplePhotoOneUrl: url }),
                        'partnerOne'
                      );
                    }
                  }}
                />
              </label>
            </div>
            <textarea
              rows={3}
              value={content.partnerOneBio}
              onChange={(e) =>
                setContent({ ...content, partnerOneBio: e.target.value })
              }
              className="w-full border border-editorialBorder bg-ivory p-3 font-montserrat text-xs"
            />
          </div>

          <div className="space-y-3">
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal">
              Partner Two Portrait URL &amp; Bio
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={content.couplePhotoTwoUrl}
                onChange={(e) =>
                  setContent({ ...content, couplePhotoTwoUrl: e.target.value })
                }
                className="flex-1 border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
              <label className="cursor-pointer inline-flex items-center gap-1.5 border border-charcoal bg-ivory px-3 py-2 font-montserrat text-xs text-charcoal hover:bg-charcoal hover:text-ivory">
                <Upload className="h-3.5 w-3.5" />
                <span>
                  {uploadingField === 'partnerTwo' ? 'Uploading...' : 'Upload'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      handleFileUpload(
                        f,
                        'image',
                        (url) =>
                          setContent({ ...content, couplePhotoTwoUrl: url }),
                        'partnerTwo'
                      );
                    }
                  }}
                />
              </label>
            </div>
            <textarea
              rows={3}
              value={content.partnerTwoBio}
              onChange={(e) =>
                setContent({ ...content, partnerTwoBio: e.target.value })
              }
              className="w-full border border-editorialBorder bg-ivory p-3 font-montserrat text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-editorialBorder">
          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Our Story Section Title
            </label>
            <input
              type="text"
              value={content.storySectionTitle}
              onChange={(e) =>
                setContent({ ...content, storySectionTitle: e.target.value })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>

          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Our Story Section Subtitle
            </label>
            <input
              type="text"
              value={content.storySectionSubtitle}
              onChange={(e) =>
                setContent({ ...content, storySectionSubtitle: e.target.value })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
            Our Story Introductory Paragraph
          </label>
          <textarea
            rows={3}
            value={content.storyIntroText}
            onChange={(e) =>
              setContent({ ...content, storyIntroText: e.target.value })
            }
            className="w-full border border-editorialBorder bg-ivory p-3 font-montserrat text-xs"
          />
        </div>
      </div>

      {/* 5. Background Music Configuration */}
      <div className="border border-editorialBorder bg-warmWhite p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2 border-b border-editorialBorder pb-2">
          <Music className="h-4 w-4 text-softGold" />
          <h2 className="font-cormorant text-2xl text-charcoal">
            5. Background Music Asset (Client Audio File)
          </h2>
        </div>

        <p className="font-montserrat text-xs text-mutedGray">
          Upload or specify the client’s wedding music file (MP3, WAV, OGG, M4A). If left empty, the public invitation will play without background music (no synthetic audio is ever used).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Audio File URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={content.audioUrl}
                onChange={(e) =>
                  setContent({ ...content, audioUrl: e.target.value })
                }
                placeholder="Leave blank if no audio file provided yet"
                className="flex-1 border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
              {content.audioUrl && (
                <button
                  type="button"
                  onClick={() => setContent({ ...content, audioUrl: '' })}
                  className="border border-editorialBorder px-3 py-2 text-red-800 hover:bg-red-50"
                  title="Remove audio"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Audio Track Title
            </label>
            <input
              type="text"
              value={content.audioTitle}
              onChange={(e) =>
                setContent({ ...content, audioTitle: e.target.value })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>
        </div>

        <div>
          <label className="cursor-pointer inline-flex items-center gap-2 border border-charcoal bg-ivory px-4 py-2 font-montserrat text-xs text-charcoal hover:bg-charcoal hover:text-ivory">
            <Upload className="h-3.5 w-3.5" />
            <span>
              {uploadingField === 'audio' ? 'Uploading Audio...' : 'Upload Audio File (MP3/WAV)'}
            </span>
            <input
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  handleFileUpload(
                    f,
                    'audio',
                    (url) => setContent({ ...content, audioUrl: url }),
                    'audio'
                  );
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* 6. Footer Content */}
      <div className="border border-editorialBorder bg-warmWhite p-6 shadow-card space-y-4">
        <h2 className="font-cormorant text-2xl text-charcoal border-b border-editorialBorder pb-2">
          6. Footer Content
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Footer Closing Message
            </label>
            <input
              type="text"
              value={content.footerClosingMessage}
              onChange={(e) =>
                setContent({ ...content, footerClosingMessage: e.target.value })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>
          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
              Footer Copyright / Credit
            </label>
            <input
              type="text"
              value={content.footerCopyright}
              onChange={(e) =>
                setContent({ ...content, footerCopyright: e.target.value })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>
        </div>
      </div>
    </form>
  );
}

