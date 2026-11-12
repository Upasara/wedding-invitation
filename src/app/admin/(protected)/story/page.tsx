'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import { StoryEntry } from '@/lib/types/domain';

const EMPTY_STORY: Omit<StoryEntry, 'id' | 'updatedAt'> & { id?: string } = {
  title: '',
  dateLabel: '',
  caption: '',
  description: '',
  imageUrl: '',
  order: 1,
  active: true,
};

export default function AdminStoryPage() {
  const [entries, setEntries] = useState<StoryEntry[]>([]);
  const [editing, setEditing] = useState<typeof EMPTY_STORY | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/story')
      .then((r) => r.json())
      .then((d) => {
        if (d.storyEntries) setEntries(d.storyEntries);
      });
  }, []);

  async function saveEntry(payload: typeof EMPTY_STORY) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.storyEntries) {
        setEntries(data.storyEntries);
        setEditing(null);
        setMessage('Story milestone saved.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this story milestone?')) return;
    const res = await fetch(`/api/admin/story?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (res.ok && data.storyEntries) {
      setEntries(data.storyEntries);
    }
  }

  async function handleMove(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= entries.length) return;
    const reordered = [...entries];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].order !== i + 1 || i === index || i === target) {
        await saveEntry({ ...reordered[i], order: i + 1 });
      }
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-editorialBorder pb-5">
        <div>
          <p className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold">
            Editorial Chapters
          </p>
          <h1 className="mt-1 font-cormorant text-3xl sm:text-4xl text-charcoal">
            Our Story Milestones
          </h1>
        </div>

        <button
          type="button"
          onClick={() =>
            setEditing({
              ...EMPTY_STORY,
              order: entries.length + 1,
            })
          }
          className="inline-flex items-center gap-2 border border-charcoal bg-charcoal px-5 py-2.5 font-montserrat text-xs uppercase tracking-editorial text-ivory hover:bg-transparent hover:text-charcoal"
        >
          <Plus className="h-4 w-4 text-softGold" />
          <span>Add Story Milestone</span>
        </button>
      </div>

      {message && (
        <div className="flex items-center gap-2 border border-softGold bg-warmWhite px-4 py-3 font-montserrat text-xs text-charcoal">
          <CheckCircle2 className="h-4 w-4 text-softGold" />
          <span>{message}</span>
        </div>
      )}

      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveEntry(editing);
          }}
          className="border border-softGold bg-warmWhite p-6 shadow-editorial space-y-4"
        >
          <h2 className="font-cormorant text-2xl text-charcoal">
            {editing.id ? 'Edit Milestone' : 'New Story Milestone'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Milestone Title *
              </label>
              <input
                type="text"
                required
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>

            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Date / Season Label *
              </label>
              <input
                type="text"
                required
                value={editing.dateLabel}
                onChange={(e) =>
                  setEditing({ ...editing, dateLabel: e.target.value })
                }
                placeholder="e.g. October 2022"
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Editorial Caption *
              </label>
              <input
                type="text"
                required
                value={editing.caption}
                onChange={(e) =>
                  setEditing({ ...editing, caption: e.target.value })
                }
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>

            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Photograph URL or Upload
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editing.imageUrl || ''}
                  onChange={(e) =>
                    setEditing({ ...editing, imageUrl: e.target.value })
                  }
                  className="flex-1 border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
                />
                <label className="cursor-pointer inline-flex items-center gap-1 border border-charcoal bg-ivory px-3 py-2 font-montserrat text-xs">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const fd = new FormData();
                      fd.append('file', f);
                      fd.append('mediaType', 'image');
                      const r = await fetch('/api/admin/upload', {
                        method: 'POST',
                        body: fd,
                      });
                      const d = await r.json();
                      if (d.url) setEditing({ ...editing, imageUrl: d.url });
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
              Milestone Story Narrative *
            </label>
            <textarea
              rows={3}
              required
              value={editing.description}
              onChange={(e) =>
                setEditing({ ...editing, description: e.target.value })
              }
              className="w-full border border-editorialBorder bg-ivory p-3 font-montserrat text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="inline-flex items-center gap-2 font-montserrat text-xs">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(e) =>
                  setEditing({ ...editing, active: e.target.checked })
                }
              />
              <span>Visible on Public Invitation</span>
            </label>

            <div className="flex gap-3">
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
                {saving ? 'Saving...' : 'Save Milestone'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {entries.map((entry, idx) => (
          <div
            key={entry.id}
            className="border border-editorialBorder bg-warmWhite p-5 shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <span className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold">
                {entry.dateLabel}
              </span>
              <h3 className="font-cormorant text-2xl font-medium text-charcoal">
                {entry.title}
              </h3>
              <p className="mt-1 font-montserrat text-xs text-mutedGray">
                {entry.description}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleMove(idx, -1)}
                disabled={idx === 0}
                className="p-2 border border-editorialBorder bg-ivory disabled:opacity-40"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleMove(idx, 1)}
                disabled={idx === entries.length - 1}
                className="p-2 border border-editorialBorder bg-ivory disabled:opacity-40"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEditing(entry)}
                className="inline-flex items-center gap-1 border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(entry.id)}
                className="p-2 border border-editorialBorder bg-ivory text-red-800"
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

