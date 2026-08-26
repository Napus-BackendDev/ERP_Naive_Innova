// Server-side backstop for the 1 MB image rule.
//
// The browser compresses images before upload (frontend/src/lib/imageCompress.js),
// but nothing stops a direct API call — this guard keeps oversized base64 blobs
// out of MongoDB regardless of who is calling.

export const MAX_IMAGE_BYTES = 1024 * 1024; // 1 MB

const DATA_URL_RE = /^data:([a-zA-Z0-9/+.-]+);base64,/;

// Byte length of what a base64 data URL actually encodes.
function decodedSize(dataUrl) {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) return 0;
  const b64 = dataUrl.slice(commaIdx + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

// Walk the body and reject any base64 image field over the limit. Videos are
// exempt: they are stored on disk via multer, not embedded in the document.
function findOversized(value, path = "") {
  if (typeof value === "string") {
    const m = DATA_URL_RE.exec(value);
    if (!m) return null;
    if (!m[1].startsWith("image/")) return null;
    const size = decodedSize(value);
    return size > MAX_IMAGE_BYTES ? { path, size } : null;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = findOversized(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      const hit = findOversized(v, path ? `${path}.${k}` : k);
      if (hit) return hit;
    }
    return null;
  }
  return null;
}

export function imageSizeGuard(req, res, next) {
  if (!req.body || typeof req.body !== "object") return next();
  const hit = findOversized(req.body);
  if (hit) {
    const mb = (hit.size / (1024 * 1024)).toFixed(2);
    return res.status(413).json({
      error: `รูปภาพ "${hit.path}" มีขนาด ${mb} MB เกินขีดจำกัด 1 MB — กรุณาอัปโหลดผ่านหน้าเว็บเพื่อให้ระบบย่อขนาดให้อัตโนมัติ`
    });
  }
  return next();
}

export default imageSizeGuard;
