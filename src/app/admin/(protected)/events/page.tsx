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
  ExternalLink,
} from 'lucide-react';
import { WeddingEvent } from '@/lib/types/domain';

const EMPTY_EVENT: Omit<WeddingEvent, 'id' | 'updatedAt'> & { id?: string } = {
  title: '',
  date: '2027-06-19',
  dateDisplay: 'Saturday, June 19, 2027',
  startTime: '4:30 PM',
  endTime: '6:00 PM',
  venueName: '',
  fullAddress: '',
  description: '',
  imageUrl: '',
  googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Colombo',
  directionsLabel: 'View Map & Directions',
  notes: '',
  order: 1,
  active: true,
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [editing, setEditing] = useState<typeof EMPTY_EVENT | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/events')
      .then((r) => r.json())
      .then((d) => {
        if (d.events) setEvents(d.events);
      });
  }, []);

  async function saveEvent(payload: typeof EMPTY_EVENT) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.events) {
        setEvents(data.events);
        setEditing(null);
        setMessage('Event schedule updated.');
      } else {
        setMessage(data.error || 'Failed to save event.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this wedding event permanently?')) return;
    const res = await fetch(`/api/admin/events?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (res.ok && data.events) {
      setEvents(data.events);
    }
  }

  async function handleMoveOrder(index: number, direction: -1 | 1) {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= events.length) return;
    const reordered = [...events];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].order !== i + 1 || i === index || i === targetIdx) {
        await saveEvent({ ...reordered[i], order: i + 1 });
      }
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-editorialBorder pb-5">
        <div>
          <p className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold">
            Schedule &amp; Venues
          </p>
          <h1 className="mt-1 font-cormorant text-3xl sm:text-4xl text-charcoal">
            Wedding Events Management
          </h1>
        </div>

        <button
          type="button"
          onClick={() =>
            setEditing({
              ...EMPTY_EVENT,
              order: events.length + 1,
            })
          }
          className="inline-flex items-center gap-2 border border-charcoal bg-charcoal px-5 py-2.5 font-montserrat text-xs uppercase tracking-editorial text-ivory hover:bg-transparent hover:text-charcoal"
        >
          <Plus className="h-4 w-4 text-softGold" />
          <span>Add New Event</span>
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
            saveEvent(editing);
          }}
          className="border border-softGold bg-warmWhite p-6 shadow-editorial space-y-4"
        >
          <h2 className="font-cormorant text-2xl text-charcoal">
            {editing.id ? 'Edit Wedding Event' : 'Create New Wedding Event'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Event Title *
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
                Date Display *
              </label>
              <input
                type="text"
                required
                value={editing.dateDisplay}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    dateDisplay: e.target.value,
                    date: e.target.value,
                  })
                }
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                  Start Time *
                </label>
                <input
                  type="text"
                  required
                  value={editing.startTime}
                  onChange={(e) =>
                    setEditing({ ...editing, startTime: e.target.value })
                  }
                  className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
                />
              </div>
              <div>
                <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                  End Time
                </label>
                <input
                  type="text"
                  value={editing.endTime || ''}
                  onChange={(e) =>
                    setEditing({ ...editing, endTime: e.target.value })
                  }
                  className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Venue Name *
              </label>
              <input
                type="text"
                required
                value={editing.venueName}
                onChange={(e) =>
                  setEditing({ ...editing, venueName: e.target.value })
                }
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>
            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Full Street Address *
              </label>
              <input
                type="text"
                required
                value={editing.fullAddress}
                onChange={(e) =>
                  setEditing({ ...editing, fullAddress: e.target.value })
                }
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Google Maps URL *
              </label>
              <input
                type="url"
                required
                value={editing.googleMapsUrl}
                onChange={(e) =>
                  setEditing({ ...editing, googleMapsUrl: e.target.value })
                }
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>
            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Event Image URL (Optional)
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
              Event Description *
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Event Notes (Optional)
              </label>
              <input
                type="text"
                value={editing.notes || ''}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>

            <label className="inline-flex items-center gap-2 font-montserrat text-xs text-charcoal pt-4">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(e) =>
                  setEditing({ ...editing, active: e.target.checked })
                }
              />
              <span>Visible on Public Invitation</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="border border-editorialBorder px-5 py-2 font-montserrat text-xs text-mutedGray"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="border border-charcoal bg-charcoal px-6 py-2 font-montserrat text-xs uppercase tracking-wider text-ivory"
            >
              {saving ? 'Saving...' : 'Save Event'}
            </button>
          </div>
        </form>
      )}

      {/* Event List */}
      <div className="space-y-4">
        {events.map((evt, index) => (
          <div
            key={evt.id}
            className="border border-editorialBorder bg-warmWhite p-5 shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-montserrat text-[10px] uppercase tracking-wider px-2 py-0.5 bg-ivory border border-editorialBorder">
                  #{index + 1}
                </span>
                <h3 className="font-cormorant text-2xl font-medium text-charcoal">
                  {evt.title}
                </h3>
                <span
                  className={`font-montserrat text-[10px] uppercase px-2 py-0.5 ${
                    evt.active
                      ? 'bg-softGold/20 text-charcoal'
                      : 'bg-charcoal/10 text-mutedGray'
                  }`}
                >
                  {evt.active ? 'Active' : 'Hidden'}
                </span>
              </div>
              <p className="mt-1 font-montserrat text-xs text-mutedGray">
                {evt.dateDisplay} • {evt.startTime}
                {evt.endTime ? ` – ${evt.endTime}` : ''} • {evt.venueName}
              </p>
              <a
                href={evt.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 font-montserrat text-[11px] text-softGold hover:underline"
              >
                <span>Google Maps Link</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMoveOrder(index, -1)}
                disabled={index === 0}
                className="p-2 border border-editorialBorder bg-ivory disabled:opacity-40"
                title="Move up"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleMoveOrder(index, 1)}
                disabled={index === events.length - 1}
                className="p-2 border border-editorialBorder bg-ivory disabled:opacity-40"
                title="Move down"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEditing(evt)}
                className="inline-flex items-center gap-1 border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs text-charcoal hover:border-softGold"
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(evt.id)}
                className="p-2 border border-editorialBorder bg-ivory text-red-800 hover:bg-red-50"
                title="Delete event"
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

