// Central image-size policy for Naive Ops.
//
// RULE: no image may enter the system larger than 1 MB. Anything bigger is
// downscaled/re-encoded in the browser before it is base64'd into MongoDB or
// posted to /production/upload. Videos are passed through untouched (they are
// stored as files on disk, not in the DB).

export const MAX_IMAGE_BYTES = 1024 * 1024; // 1 MB

// A data URL is ~4/3 the size of the bytes it encodes; keep the encoded string
// itself under the limit so the DB document stays within budget.
const BASE64_OVERHEAD = 4 / 3;

const readAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

const loadImage = (dataUrl) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

// Downscale + re-encode until the result fits `maxBytes`.
// Strategy: cap the longest edge, then walk JPEG quality down; if still too big,
// shrink the dimensions and retry. Transparency is lost (JPEG) — acceptable for
// the QC/evidence photos this app stores.
async function shrinkToFit(file, maxBytes) {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  let maxEdge = Math.max(img.width, img.height);
  // Start from a sane cap so huge phone photos don't do many wasted passes.
  if (maxEdge > 2000) maxEdge = 2000;

  for (let attempt = 0; attempt < 8; attempt++) {
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    // JPEG has no alpha — flatten onto white so PNG transparency doesn't go black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    for (const quality of [0.85, 0.7, 0.55, 0.4]) {
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);
      if (blob && blob.size * BASE64_OVERHEAD <= maxBytes) {
        return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
          type: "image/jpeg",
          lastModified: Date.now()
        });
      }
    }
    maxEdge = Math.round(maxEdge * 0.75); // still too big — shrink and retry
  }

  // Last resort: smallest pass we can produce, so the upload still succeeds.
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = Math.max(1, Math.round((img.height / img.width) * 800));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await canvasToBlob(canvas, "image/jpeg", 0.35);
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
    type: "image/jpeg",
    lastModified: Date.now()
  });
}

// Compress an image File so it (and its base64 form) fits under the limit.
// Already-small images are returned as-is.
export async function compressImage(file, maxBytes = MAX_IMAGE_BYTES) {
  if (!file) return file;
  // Video upload was removed — everything is stored in MongoDB now and a clip
  // cannot fit in a document. Fail here rather than at the server, so the caller
  // sees which file was wrong.
  if (!file.type?.startsWith("image/")) {
    throw new Error("รองรับเฉพาะไฟล์รูปภาพเท่านั้น (ไม่รองรับวิดีโอแล้ว)");
  }
  if (file.size * BASE64_OVERHEAD <= maxBytes) return file;
  try {
    return await shrinkToFit(file, maxBytes);
  } catch (err) {
    console.error("Image compression failed, using original:", err);
    return file;
  }
}

// Compress then base64 — the only way images should be written into MongoDB.
export async function compressImageToBase64(file, maxBytes = MAX_IMAGE_BYTES) {
  const compressed = await compressImage(file, maxBytes);
  return readAsDataURL(compressed);
}
