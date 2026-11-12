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
import { WeddingPartyMember } from '@/lib/types/domain';

const EMPTY_MEMBER: Omit<WeddingPartyMember, 'id' | 'updatedAt'> & { id?: string } = {
  name: '',
  role: '',
  imageUrl: '',
  description: '',
  order: 1,
  active: true,
};

export default function AdminWeddingPartyPage() {
  const [members, setMembers] = useState<WeddingPartyMember[]>([]);
  const [editing, setEditing] = useState<typeof EMPTY_MEMBER | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/party')
      .then((r) => r.json())
      .then((d) => {
        if (d.weddingParty) setMembers(d.weddingParty);
      });
  }, []);

  async function saveMember(payload: typeof EMPTY_MEMBER) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.weddingParty) {
        setMembers(data.weddingParty);
        setEditing(null);
        setMessage('Wedding party updated.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Remove this wedding party entry?')) return;
    const res = await fetch(`/api/admin/party?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (res.ok && data.weddingParty) {
      setMembers(data.weddingParty);
    }
  }

  async function handleMove(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= members.length) return;
    const reordered = [...members];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].order !== i + 1 || i === index || i === target) {
        await saveMember({ ...reordered[i], order: i + 1 });
      }
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-editorialBorder pb-5">
        <div>
          <p className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold">
            Custom Roles &amp; Attendants
          </p>
          <h1 className="mt-1 font-cormorant text-3xl sm:text-4xl text-charcoal">
            Wedding Party Management
          </h1>
        </div>

        <button
          type="button"
          onClick={() =>
            setEditing({
              ...EMPTY_MEMBER,
              order: members.length + 1,
            })
          }
          className="inline-flex items-center gap-2 border border-charcoal bg-charcoal px-5 py-2.5 font-montserrat text-xs uppercase tracking-editorial text-ivory hover:bg-transparent hover:text-charcoal"
        >
          <Plus className="h-4 w-4 text-softGold" />
          <span>Add Wedding Party Member</span>
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
            saveMember(editing);
          }}
          className="border border-softGold bg-warmWhite p-6 shadow-editorial space-y-4"
        >
          <h2 className="font-cormorant text-2xl text-charcoal">
            {editing.id ? 'Edit Wedding Party Entry' : 'New Wedding Party Entry'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Person’s Full Name *
              </label>
              <input
                type="text"
                required
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>

            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Custom Role / Title * (e.g. Best Man, Maid of Honor, Parents, Ring Bearer)
              </label>
              <input
                type="text"
                required
                value={editing.role}
                onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                placeholder="Enter any custom role"
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Short Description (Optional)
              </label>
              <input
                type="text"
                value={editing.description || ''}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>
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
              <span>Active on Public Invitation</span>
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
                {saving ? 'Saving...' : 'Save Member'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map((m, idx) => (
          <div
            key={m.id}
            className="border border-editorialBorder bg-warmWhite p-5 shadow-card flex items-center justify-between gap-4"
          >
            <div>
              <span className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold">
                {m.role}
              </span>
              <h3 className="font-cormorant text-2xl font-medium text-charcoal">
                {m.name}
              </h3>
              {m.description && (
                <p className="mt-1 font-montserrat text-xs text-mutedGray">
                  {m.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleMove(idx, -1)}
                disabled={idx === 0}
                className="p-1.5 border border-editorialBorder bg-ivory disabled:opacity-40"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleMove(idx, 1)}
                disabled={idx === members.length - 1}
                className="p-1.5 border border-editorialBorder bg-ivory disabled:opacity-40"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEditing(m)}
                className="border border-editorialBorder bg-ivory px-2.5 py-1.5 font-montserrat text-xs"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(m.id)}
                className="p-1.5 border border-editorialBorder bg-ivory text-red-800"
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

