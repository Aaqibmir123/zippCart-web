import { apiRequest } from "../api/client";
import { assertUserSession, type SessionScope } from "../auth/session-scope";
import { waitForForeground } from "../api/foreground-request";

const supportedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export async function prepareImage(
  file: File,
  dimension = 1200,
  maxBytes = 512000,
  quality = 0.7,
): Promise<Blob> {
  if (!supportedTypes.has(file.type))
    throw new Error("Choose a JPEG, PNG, WebP or AVIF image.");
  if (!file.size || file.size > 10 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 10 MB.");
  const url = URL.createObjectURL(file);
  const image = new Image();
  const canvas = document.createElement("canvas");
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not read this photo."));
      image.src = url;
    });
    if (
      !image.naturalWidth ||
      image.naturalWidth * image.naturalHeight > 40000000
    )
      throw new Error("Choose a photo smaller than 40 megapixels.");
    const ratio = Math.min(
      1,
      dimension / Math.max(image.naturalWidth, image.naturalHeight),
    );
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Photo preparation is unavailable in this browser.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error("Could not prepare photo.")),
        "image/jpeg",
        quality,
      ),
    );
    if (!blob.size || blob.size > maxBytes)
      throw new Error("Photo is too large. Choose a smaller, simpler photo.");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
    image.src = "";
    canvas.width = 0;
    canvas.height = 0;
  }
}

export function imageDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read prepared photo."));
    reader.readAsDataURL(blob);
  });
}

async function validateProductImage(file: File): Promise<Blob> {
  if (!supportedTypes.has(file.type))
    throw new Error("Choose a JPEG, PNG, WebP or AVIF image.");
  if (!file.size || file.size > 10 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 10 MB.");
  return file;
}

// Keep product source bytes intact in the browser. The authenticated backend
// applies EXIF orientation, bounded resizing and high-quality encoding before
// Cloudinary receives the normalized master, preserving transparency and detail.
export async function uploadProductImage(file: File, session: SessionScope) {
  assertUserSession(session);
  await waitForForeground(session.signal);
  assertUserSession(session);
  const blob = await validateProductImage(file);
  assertUserSession(session);
  await waitForForeground(session.signal);
  assertUserSession(session);
  const response = await apiRequest<{ url: string }>("/media/products", {
    imageBody: blob,
    timeoutMs: 60000,
  });
  assertUserSession(session);
  if (!response.url?.startsWith("https://res.cloudinary.com/"))
    throw new Error("The server returned an invalid image.");
  return response.url;
}
