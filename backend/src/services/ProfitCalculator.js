// netProfit = modalPrice * quantity - transportCost ; prices in Rs/quintal, qty in quintals
export function haversineKm(a, b) {
  const r = x => (x * Math.PI) / 180, R = 6371;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export function transportCost(km, quantity, ratePerQuintalKm) {
  return Math.round(km * quantity * ratePerQuintalKm);
}
export function netProfit(modalPrice, quantity, cost) { return modalPrice * quantity - cost; }
export function rankMarkets(rows, origin, quantity, rate) {
  return rows.map(m => {
    const km = Math.round(haversineKm(origin, m));
    const cost = transportCost(km, quantity, rate);
    return { ...m, km, transportCost: cost, gross: m.modal * quantity, netProfit: netProfit(m.modal, quantity, cost) };
  }).sort((a, b) => b.netProfit - a.netProfit).map((m, i) => ({ ...m, rank: i + 1 }));
}
