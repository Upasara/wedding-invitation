import { NextResponse } from 'next/server';
import { requireAuthorizedAdmin } from '@/lib/security/admin-guard';
import { parseStrictJsonBody } from '@/lib/security/csrf';
import { galleryImageInputSchema } from '@/lib/validation/schemas';
import {
  deleteAdminGalleryImage,
  listAdminGalleryImages,
  upsertAdminGalleryImage,
} from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  const check = await requireAuthorizedAdmin();
  if (!check.ok) return check.response;
  const galleryImages = await listAdminGalleryImages();
  return NextResponse.json({ galleryImages }, { status: 200 });
}

export async function POST(request: Request) {
  const check = await requireAuthorizedAdmin(request);
  if (!check.ok) return check.response;

  const parsed = await parseStrictJsonBody(request, 32 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const validation = galleryImageInputSchema.safeParse(parsed.data);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message || 'Invalid gallery image data.' },
      { status: 400 }
    );
  }

  const saved = await upsertAdminGalleryImage(validation.data);
  const galleryImages = await listAdminGalleryImages();
  return NextResponse.json({ ok: true, galleryImage: saved, galleryImages }, { status: 200 });
}

export async function DELETE(request: Request) {
  const check = await requireAuthorizedAdmin(request);
  if (!check.ok) return check.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Gallery image ID is required.' }, { status: 400 });
  }

  await deleteAdminGalleryImage(id);
  const galleryImages = await listAdminGalleryImages();
  return NextResponse.json({ ok: true, galleryImages }, { status: 200 });
}

