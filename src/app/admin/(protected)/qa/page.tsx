'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
} from 'lucide-react';
import { FaqEntry } from '@/lib/types/domain';

const EMPTY_FAQ: Omit<FaqEntry, 'id' | 'updatedAt'> & { id?: string } = {
  question: '',
  answer: '',
  order: 1,
  active: true,
};

export default function AdminQaPage() {
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  const [editing, setEditing] = useState<typeof EMPTY_FAQ | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/faqs')
      .then((r) => r.json())
      .then((d) => {
        if (d.faqs) setFaqs(d.faqs);
      });
  }, []);

  async function saveFaq(payload: typeof EMPTY_FAQ) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.faqs) {
        setFaqs(data.faqs);
        setEditing(null);
        setMessage('Q&A entry saved.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this question and answer?')) return;
    const res = await fetch(`/api/admin/faqs?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (res.ok && data.faqs) {
      setFaqs(data.faqs);
    }
  }

  async function handleMove(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= faqs.length) return;
    const reordered = [...faqs];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].order !== i + 1 || i === index || i === target) {
        await saveFaq({ ...reordered[i], order: i + 1 });
      }
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-editorialBorder pb-5">
        <div>
          <p className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold">
            Guest Guidance
          </p>
          <h1 className="mt-1 font-cormorant text-3xl sm:text-4xl text-charcoal">
            Questions &amp; Answers (FAQ)
          </h1>
        </div>

        <button
          type="button"
          onClick={() =>
            setEditing({
              ...EMPTY_FAQ,
              order: faqs.length + 1,
            })
          }
          className="inline-flex items-center gap-2 border border-charcoal bg-charcoal px-5 py-2.5 font-montserrat text-xs uppercase tracking-editorial text-ivory hover:bg-transparent hover:text-charcoal"
        >
          <Plus className="h-4 w-4 text-softGold" />
          <span>Add Question</span>
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
            saveFaq(editing);
          }}
          className="border border-softGold bg-warmWhite p-6 shadow-editorial space-y-4"
        >
          <h2 className="font-cormorant text-2xl text-charcoal">
            {editing.id ? 'Edit Question & Answer' : 'New Question & Answer'}
          </h2>

          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
              Question *
            </label>
            <input
              type="text"
              required
              value={editing.question}
              onChange={(e) =>
                setEditing({ ...editing, question: e.target.value })
              }
              className="w-full border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
            />
          </div>

          <div>
            <label className="block font-montserrat text-[11px] uppercase tracking-wider mb-1">
              Answer *
            </label>
            <textarea
              rows={3}
              required
              value={editing.answer}
              onChange={(e) =>
                setEditing({ ...editing, answer: e.target.value })
              }
              className="w-full border border-editorialBorder bg-ivory p-3 font-montserrat text-xs"
            />
          </div>

          <div className="flex items-center justify-between">
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
                {saving ? 'Saving...' : 'Save Q&A'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div
            key={faq.id}
            className="border border-editorialBorder bg-warmWhite p-5 shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-cormorant text-2xl font-medium text-charcoal">
                  {faq.question}
                </h3>
                <span
                  className={`font-montserrat text-[10px] uppercase px-2 py-0.5 ${
                    faq.active
                      ? 'bg-softGold/20 text-charcoal'
                      : 'bg-charcoal/10 text-mutedGray'
                  }`}
                >
                  {faq.active ? 'Active' : 'Hidden'}
                </span>
              </div>
              <p className="mt-1 font-montserrat text-xs text-mutedGray">
                {faq.answer}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
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
                disabled={idx === faqs.length - 1}
                className="p-2 border border-editorialBorder bg-ivory disabled:opacity-40"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEditing(faq)}
                className="inline-flex items-center gap-1 border border-editorialBorder bg-ivory px-3 py-2 font-montserrat text-xs"
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(faq.id)}
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

