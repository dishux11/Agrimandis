// Normalise any unit to Rs/quintal
const F = { quintal: 1, qtl: 1, kg: 100, tonne: 0.1, ton: 0.1 };
export function toQuintal(price, unit = 'quintal') {
  const f = F[String(unit).trim().toLowerCase()];
  const p = Number(price);
  if (f === undefined) return { error: `unknown unit "${unit}"` };
  if (!Number.isFinite(p) || p <= 0) return { error: 'missing or invalid price' };
  return { value: Math.round(p * f) };
}
