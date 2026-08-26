// ---------------------------------------------------------------------------
// Lot MFG / EXP dates.
//
// The spec modal renders an auto EXP date (+2 years) straight in the input's
// `value`, but never writes it into state — so nothing reaches the database and
// every printed spec sheet showed "วันหมดอายุ (EXP): -". These helpers give the
// one shelf-life rule a single home: the modal persists it on save, and the
// document falls back to it for the records saved before this fix.
// ---------------------------------------------------------------------------

export const SHELF_LIFE_YEARS = 2;

// "2026-07-21T00:00:00.000Z" | Date | "2026-07-21" -> "2026-07-21".
// Sliced, not parsed through Date, so a UTC timestamp cannot slip back a day
// for anyone east of Greenwich — which is everyone using this system.
export function toDateOnly(value) {
  if (!value) return "";
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "";
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${m}-${d}`;
  }
  const s = String(value).trim();
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? match[0] : "";
}

// Add whole years on the date parts. Feb 29 + 1 year clamps to Feb 28.
export function addYears(dateStr, years = SHELF_LIFE_YEARS) {
  const base = toDateOnly(dateStr);
  if (!base) return "";
  const [y, m, d] = base.split("-").map(Number);
  const target = new Date(y + years, m - 1, 1);
  const lastDay = new Date(y + years, m, 0).getDate();
  target.setDate(Math.min(d, lastDay));
  return toDateOnly(target);
}

export function todayDateOnly() {
  return toDateOnly(new Date());
}

// MFG for an ordered line: explicit value first, then the production stamp.
export function resolveMfgDate(item = {}) {
  return toDateOnly(item.mfgDate) || toDateOnly(item.lotStampMfg) || "";
}

// EXP for an ordered line. Falls back to MFG + shelf life so a sheet never
// prints a blank expiry — a bottle on a shelf with no EXP is not shippable.
export function resolveExpDate(item = {}) {
  const explicit = toDateOnly(item.expDate) || toDateOnly(item.lotStampExp);
  if (explicit) return explicit;
  const mfg = resolveMfgDate(item);
  return mfg ? addYears(mfg) : "";
}

// Fill in whatever the spec modal left empty, right before saving.
export function withLotDates(item = {}) {
  const mfgDate = resolveMfgDate(item) || todayDateOnly();
  return { ...item, mfgDate, expDate: resolveExpDate({ ...item, mfgDate }) };
}
