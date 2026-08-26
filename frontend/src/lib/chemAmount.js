// Formatting rule for CHEMICAL quantities.
//
// HARD RULE: show the EXACT amount. Never round up, never truncate.
// 299.75 g/kg x 5 kg = 1,498.75 g must read "1,498.75" — not 1,498.8 (rounded up,
// over-doses the batch) and not 1,498.7 (truncated, under-doses it). The number on
// screen is the number the operator weighs out, so it has to be the real one.
//
// Use fmtChem() for every gram/kg figure of a raw material. Money, piece counts
// and other non-chemical numbers are not affected.

// Float noise guard: 0.29975 * 5000 evaluates to 1498.7500000000002 in IEEE-754.
// Snapping at 6 decimals removes the artifact while keeping every digit a real
// recipe could carry (BOM ratios are stored to 4 decimals).
const NOISE_DIGITS = 6;

export function exactChem(n) {
  const v = Number(n);
  if (!isFinite(v)) return 0;
  return Number(v.toFixed(NOISE_DIGITS));
}

// Exact value with thousands separators and no padding zeros:
//   1498.75 -> "1,498.75"    250 -> "250"    0.5 -> "0.5"
export function fmtChem(n) {
  return exactChem(n).toLocaleString(undefined, { maximumFractionDigits: NOISE_DIGITS });
}

export default fmtChem;
