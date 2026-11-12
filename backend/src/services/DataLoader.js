import { parse } from 'csv-parse/sync';
import { db } from '../db.js';
import { toQuintal } from './PriceService.js';
// CSV columns: market,district,state,commodity,date,modal_price,unit
export function importCsv(buffer) {
  const rows = parse(buffer, { columns: h => h.map(x => x.trim().toLowerCase()), skip_empty_lines: true, trim: true });
  const rep = { imported: 0, skipped: [] };
  const mk = db.prepare('SELECT id FROM markets WHERE name=?'), cm = db.prepare('SELECT id FROM commodities WHERE lower(name)=lower(?)');
  const up = db.prepare('INSERT INTO prices(market_id,commodity_id,date,modal) VALUES(?,?,?,?) ON CONFLICT(market_id,commodity_id,date) DO UPDATE SET modal=excluded.modal');
  rows.forEach((r, i) => {
    const line = i + 2, m = mk.get(r.market), c = cm.get(r.commodity), p = toQuintal(r.modal_price, r.unit || 'quintal');
    if (!c) return rep.skipped.push({ line, reason: `unknown crop "${r.commodity}"` });
    if (!m) return rep.skipped.push({ line, reason: `unknown market "${r.market}"` });
    if (p.error) return rep.skipped.push({ line, reason: p.error });
    up.run(m.id, c.id, r.date, p.value); rep.imported++;
  });
  return rep;
}
// Placeholder for data.gov.in (Agmarknet) resource API. Set DATA_GOV_KEY and map fields to the CSV shape above.
export async function fetchApi() { return { imported: 0, note: 'API placeholder: wire data.gov.in resource here' }; }
