import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { requireAuthorizedAdmin } from '@/lib/security/admin-guard';
import {
  getFirebaseAdminStorage,
  isFirebaseDriverConfigured,
} from '@/lib/db/firebase-admin';
import {
  ALLOWED_AUDIO_MIMES,
  ALLOWED_IMAGE_MIMES,
  MAX_AUDIO_SIZE,
  MAX_IMAGE_SIZE,
  verifyFileMagicBytes,
} from '@/lib/security/file-validation';

export async function POST(request: Request) {
  const check = await requireAuthorizedAdmin(request);
  if (!check.ok) return check.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const mediaType = (formData.get('mediaType') || 'image').toString();

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No valid file provided for upload.' },
        { status: 400 }
      );
    }

    const mime = file.type.toLowerCase();
    const isAudio = mediaType === 'audio';
    const allowedMap = isAudio ? ALLOWED_AUDIO_MIMES : ALLOWED_IMAGE_MIMES;
    const maxBytes = isAudio ? MAX_AUDIO_SIZE : MAX_IMAGE_SIZE;

    if (!allowedMap[mime]) {
      return NextResponse.json(
        {
          error: isAudio
            ? 'Unsupported audio format. Allowed formats: MP3, WAV, OGG, AAC, M4A.'
            : 'Unsupported image format. Allowed formats: JPEG, PNG, WebP, AVIF.',
        },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > maxBytes) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum limit (${
            isAudio ? '20 MB' : '8 MB'
          }).`,
        },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!verifyFileMagicBytes(buffer, mime)) {
      return NextResponse.json(
        {
          error:
            'File content signature does not match the declared file type.',
        },
        { status: 400 }
      );
    }

    const ext = allowedMap[mime];
    const safePrefix = isAudio ? 'audio' : 'img';
    const randomId = crypto.randomBytes(10).toString('hex');
    const fileName = `${safePrefix}_${Date.now()}_${randomId}${ext}`;

    // 1. If Firebase Storage is configured, upload directly to Firebase Storage bucket
    if (isFirebaseDriverConfigured()) {
      const storage = getFirebaseAdminStorage();
      if (storage) {
        const bucket = storage.bucket();
        const folder = isAudio ? 'wedding/audio' : 'wedding/images';
        const objectPath = `${folder}/${fileName}`;
        const storageFile = bucket.file(objectPath);
        const downloadToken = crypto.randomUUID();

        await storageFile.save(buffer, {
          metadata: {
            contentType: mime,
            cacheControl: 'public, max-age=31536000',
            metadata: {
              firebaseStorageDownloadTokens: downloadToken,
            },
          },
        });

        const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
        const encodedPath = encodeURIComponent(objectPath);
        const publicUrl = emulatorHost
          ? `http://${emulatorHost}/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`
          : `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

        return NextResponse.json(
          {
            ok: true,
            url: publicUrl,
            fileName,
            size: file.size,
            mimeType: mime,
            storageDriver: 'firebase-storage',
          },
          { status: 200 }
        );
      }
    }

    // 2. Local development fallback: write to public/uploads/
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const targetPath = path.join(uploadsDir, fileName);
    if (!targetPath.startsWith(uploadsDir)) {
      return NextResponse.json(
        { error: 'Invalid upload destination.' },
        { status: 400 }
      );
    }

    fs.writeFileSync(targetPath, buffer);
    const publicUrl = `/uploads/${fileName}`;

    return NextResponse.json(
      {
        ok: true,
        url: publicUrl,
        fileName,
        size: file.size,
        mimeType: mime,
        storageDriver: 'local',
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to process file upload.' },
      { status: 500 }
    );
  }
}
