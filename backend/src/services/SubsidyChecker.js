// Rule-based, advisory only. No filing.
export function check(schemes, { landHa, crop, state }) {
  return schemes.map(s => {
    const reasons = [];
    if (s.state && s.state !== 'ALL' && s.state.toLowerCase() !== String(state).toLowerCase()) reasons.push('state');
    if (s.min_land != null && landHa < s.min_land) reasons.push('land below minimum');
    if (s.max_land != null && landHa > s.max_land) reasons.push('land above limit');
    if (s.crops && s.crops !== 'ALL' && !s.crops.toLowerCase().split(',').includes(String(crop).toLowerCase())) reasons.push('crop');
    return { ...s, eligible: reasons.length === 0, reasons, checklist: s.docs.split(',') };
  });
}
