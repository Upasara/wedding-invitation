// ==============================================================================
// Binary File Magic-Byte & MIME Validation for Admin Media Uploads
// ==============================================================================

export const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8 MB
export const MAX_AUDIO_SIZE = 20 * 1024 * 1024; // 20 MB

export const ALLOWED_IMAGE_MIMES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};

export const ALLOWED_AUDIO_MIMES: Record<string, string> = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/aac': '.aac',
  'audio/mp4': '.m4a',
};

export function verifyFileMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;

  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mimeType === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  if (mimeType === 'image/avif') {
    return buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  }
  if (mimeType === 'audio/mpeg' || mimeType === 'audio/mp3') {
    const isId3 = buffer.subarray(0, 3).toString('ascii') === 'ID3';
    const isMpegSync = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
    return isId3 || isMpegSync;
  }
  if (mimeType === 'audio/wav') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WAVE'
    );
  }
  if (mimeType === 'audio/ogg') {
    return buffer.subarray(0, 4).toString('ascii') === 'OggS';
  }
  if (mimeType === 'audio/mp4' || mimeType === 'audio/aac') {
    return (
      buffer.subarray(4, 8).toString('ascii') === 'ftyp' ||
      (buffer[0] === 0xff && (buffer[1] & 0xf0) === 0xf0)
    );
  }
  return false;
}

