import { useState, useRef } from 'react';
import { uploadBoardImage } from '../../lib/boardsApi';

/**
 * ImageUploader — handles image selection, client-side processing,
 * and upload to Supabase Storage.
 *
 * Processing pipeline (all client-side, no server needed):
 * 1. Read selected file as an Image element
 * 2. Resize to max 1200px on longest side (canvas)
 * 3. Re-export as JPEG at 80% quality
 *    - Canvas re-export naturally strips EXIF data (DEC-028),
 *      removing GPS coordinates and device info for privacy
 * 4. Upload the resulting blob to Supabase Storage
 * 5. Return the public URL to the parent component
 *
 * Shows upload progress state (selecting, processing, uploading, done).
 */

interface ImageUploaderProps {
  userId: string;
  onUploaded: (url: string) => void;
}

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.8;

type UploadState = 'idle' | 'processing' | 'uploading' | 'error';

export function ImageUploader({ userId, onUploaded }: ImageUploaderProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    inputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset for next use
    if (inputRef.current) inputRef.current.value = '';

    setErrorMsg(null);
    setState('processing');

    try {
      // Step 1: Read the file as an image
      const img = await loadImage(file);

      // Step 2: Resize and compress via canvas
      const blob = await processImage(img);

      // Step 3: Upload to Supabase Storage
      setState('uploading');
      const url = await uploadBoardImage(userId, blob, 'jpg');

      setState('idle');
      onUploaded(url);
    } catch (err: any) {
      console.error('[ImageUploader] Failed:', err);
      setErrorMsg(err.message || 'Upload failed. Please try again.');
      setState('error');
      // Auto-clear error after 3 seconds
      setTimeout(() => {
        setState('idle');
        setErrorMsg(null);
      }, 3000);
    }
  }

  return (
    <div className="image-uploader">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <button
        className="image-uploader-btn"
        onClick={handleClick}
        disabled={state === 'processing' || state === 'uploading'}
      >
        {state === 'processing' && 'Processing…'}
        {state === 'uploading' && 'Uploading…'}
        {state === 'idle' && (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Add image
          </>
        )}
        {state === 'error' && 'Try again'}
      </button>

      {errorMsg && (
        <p className="image-uploader-error">{errorMsg}</p>
      )}
    </div>
  );
}

// ─── Helper functions ────────────────────────────────────────

/**
 * Load a File as an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image file.'));
    };
    img.src = url;
  });
}

/**
 * Resize an image to max 1200px on its longest side and compress
 * to JPEG at 80% quality. Canvas re-export strips EXIF metadata
 * automatically — no separate EXIF library needed.
 */
function processImage(img: HTMLImageElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let { width, height } = img;

    // Scale down if either dimension exceeds MAX_DIMENSION
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas context not available.'));
      return;
    }

    ctx.drawImage(img, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Image compression failed.'));
        }
      },
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}
