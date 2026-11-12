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
import { GalleryImage } from '@/lib/types/domain';

const EMPTY_IMAGE: Omit<GalleryImage, 'id' | 'uploadedAt'> & { id?: string } = {
  imageUrl: '',
  caption: '',
  altText: '',
  aspectRatio: 'portrait',
  order: 1,
  active: true,
};

export default function AdminGalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [editing, setEditing] = useState<typeof EMPTY_IMAGE | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/gallery')
      .then((r) => r.json())
      .then((d) => {
        if (d.galleryImages) setImages(d.galleryImages);
      });
  }, []);

  async function saveImage(payload: typeof EMPTY_IMAGE) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.galleryImages) {
        setImages(data.galleryImages);
        setEditing(null);
        setMessage('Gallery updated.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this photograph from the gallery?')) return;
    const res = await fetch(`/api/admin/gallery?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (res.ok && data.galleryImages) {
      setImages(data.galleryImages);
    }
  }

  async function handleMove(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const reordered = [...images];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].order !== i + 1 || i === index || i === target) {
        await saveImage({ ...reordered[i], order: i + 1 });
      }
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-editorialBorder pb-5">
        <div>
          <p className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold">
            Visual Curation
          </p>
          <h1 className="mt-1 font-cormorant text-3xl sm:text-4xl text-charcoal">
            Photo Gallery Management
          </h1>
        </div>

        <button
          type="button"
          onClick={() =>
            setEditing({
              ...EMPTY_IMAGE,
              order: images.length + 1,
            })
          }
          className="inline-flex items-center gap-2 border border-charcoal bg-charcoal px-5 py-2.5 font-montserrat text-xs uppercase tracking-editorial text-ivory hover:bg-transparent hover:text-charcoal"
        >
          <Plus className="h-4 w-4 text-softGold" />
          <span>Add Photograph</span>
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
            saveImage(editing);
          }}
          className="border border-softGold bg-warmWhite p-6 shadow-editorial space-y-4"
        >
          <h2 className="font-cormorant text-2xl text-charcoal">
            {editing.id ? 'Edit Gallery Photograph' : 'Add Gallery Photograph'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Image URL or Upload (JPEG/PNG/WebP/AVIF, max 8MB) *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={editing.imageUrl}
                  onChange={(e) =>
                    setEditing({ ...editing, imageUrl: e.target.value })
                  }
                  className="flex-1 border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
                />
                <label className="cursor-pointer inline-flex items-center gap-1 border border-charcoal bg-ivory px-3 py-2 font-montserrat text-xs">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploading ? '...' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setUploading(true);
                      try {
                        const fd = new FormData();
                        fd.append('file', f);
                        fd.append('mediaType', 'image');
                        const r = await fetch('/api/admin/upload', {
                          method: 'POST',
                          body: fd,
                        });
                        const d = await r.json();
                        if (d.url) {
                          setEditing({
                            ...editing,
                            imageUrl: d.url,
                            altText: editing.altText || f.name,
                          });
                        }
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Accessible Alt Text *
              </label>
              <input
                type="text"
                required
                value={editing.altText}
                onChange={(e) =>
                  setEditing({ ...editing, altText: e.target.value })
                }
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Editorial Caption (Optional)
              </label>
              <input
                type="text"
                value={editing.caption || ''}
                onChange={(e) =>
                  setEditing({ ...editing, caption: e.target.value })
                }
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              />
            </div>

            <div>
              <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Frame Aspect Ratio
              </label>
              <select
                value={editing.aspectRatio}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    aspectRatio: e.target.value as GalleryImage['aspectRatio'],
                  })
                }
                className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              >
                <option value="portrait">Portrait (4:5)</option>
                <option value="landscape">Landscape (16:11)</option>
                <option value="square">Square (1:1)</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="inline-flex items-center gap-2 font-montserrat text-xs">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) =>
                    setEditing({ ...editing, active: e.target.checked })
                  }
                />
                <span>Visible in Public Gallery</span>
              </label>
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
              {saving ? 'Saving...' : 'Save Photograph'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((img, idx) => (
          <div
            key={img.id}
            className="border border-editorialBorder bg-warmWhite p-4 shadow-card flex flex-col justify-between"
          >
            <div>
              <div className="aspect-[4/5] w-full overflow-hidden bg-ivory border border-editorialBorder mb-3">
                <img
                  src={img.imageUrl}
                  alt={img.altText}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="font-cormorant italic text-lg text-charcoal truncate">
                {img.caption || img.altText}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-editorialBorder flex items-center justify-between">
              <div className="flex gap-1">
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
                  disabled={idx === images.length - 1}
                  className="p-1.5 border border-editorialBorder bg-ivory disabled:opacity-40"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditing(img)}
                  className="inline-flex items-center gap-1 border border-editorialBorder bg-ivory px-2.5 py-1.5 font-montserrat text-xs"
                >
                  <Edit3 className="h-3 w-3" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(img.id)}
                  className="p-1.5 border border-editorialBorder bg-ivory text-red-800"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

