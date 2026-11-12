import { useState, useEffect, useRef } from 'react';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale } from 'chart.js';
import { T } from './i18n.js';
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale);

const api = (path, { token, body, form } = {}) => fetch('/api' + path, {
  method: body || form ? 'POST' : 'GET',
  headers: { ...(token && { Authorization: 'Bearer ' + token }), ...(body && { 'Content-Type': 'application/json' }) },
  body: form || (body && JSON.stringify(body)) }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; });

function parseQuery(q) { // "Tomato in Dharwad" | "ಟೊಮೇಟೊ ಧಾರವಾಡ"
  const p = q.split(/\s+in\s+/i); if (p.length === 2) return { crop: p[0].trim(), location: p[1].trim() };
  const w = q.trim().split(/\s+/); return { crop: w[0], location: w.slice(1).join(' ') };
}
const Panel = ({ title, children }) => <section className="panel">{title && <h2 className="h2">{title}</h2>}{children}</section>;
const Callout = ({ children }) => <span className="lbl"><span className="mark" /><span className="conn" />{children}</span>;

function TrendChart({ market, crop, t }) {
  const ref = useRef();
  useEffect(() => { let c; api(`/prices/history?market=${market}&crop=${crop}`).then(d => {
    c = new Chart(ref.current, { type: 'line', data: { labels: d.map(x => x.date.slice(5)), datasets: [{ data: d.map(x => x.modal), borderColor: '#214224', backgroundColor: '#214224', pointRadius: 2, borderWidth: 1.5 }] },
      options: { plugins: { legend: { display: false } }, animation: false } }); }); return () => c && c.destroy(); }, [market, crop]);
  return <div><p className="lbl">{t.trend} (₹/q)</p><canvas ref={ref} height="90" /></div>;
}

function Markets({ t, lang, session }) {
  const [q, setQ] = useState(''), [qty, setQty] = useState(10), [res, setRes] = useState(null), [err, setErr] = useState(''), [hist, setHist] = useState(null);
  const run = async () => { setErr(''); setHist(null); try { setRes(await api(`/rank?${new URLSearchParams({ ...parseQuery(q), qty })}`)); } catch (e) { setErr(e.message); setRes(null); } };
  const speak = () => { const R = window.SpeechRecognition || window.webkitSpeechRecognition; if (!R) return setErr('Voice input is not supported in this browser');
    const r = new R(); r.lang = lang === 'kn' ? 'kn-IN' : 'en-IN'; r.onresult = e => setQ(e.results[0][0].transcript); r.start(); };
  const setAlert = async row => { const v = prompt('Alert me when best price reaches ₹/quintal:'); if (v) await api('/alerts', { token: session.token, body: { commodity_id: res.crop.id, threshold: +v } }); };
  return <>
    <input data-testid="search" className="field search" placeholder={t.ph} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} aria-label={t.ph} />
    <div style={{ display: 'flex', gap: 12, margin: '12px 0 20px', alignItems: 'center', flexWrap: 'wrap' }}>
      <label className="lbl">{t.qty} <input className="field" type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} style={{ width: 90, marginLeft: 6 }} /></label>
      <button className="quiet" onClick={speak}>{t.speak}</button>
      <button className="cta" style={{ marginLeft: 'auto' }} onClick={run}>{t.go}</button>
    </div>
    {err && <Panel><span className="pill sky">{err}</span></Panel>}
    {res && <Panel title={`${res.crop.name} near ${res.origin}`}>
      <div style={{ overflowX: 'auto' }}><table data-testid="rank-table"><thead><tr>
        <th>{t.rank}</th><th>{t.market}</th><th className="n">{t.modal}</th><th className="n">{t.km}</th><th className="n">{t.transport}</th><th className="n">{t.net}</th><th /></tr></thead>
        <tbody>{res.results.map(r => <tr key={r.market_id}>
          <td>{r.rank === 1 ? <span className="mark" /> : r.rank}</td>
          <td>{r.name} {r.rank === 1 && <span className="pill green">{t.best}</span>}</td>
          <td className="n">{r.modal}</td><td className="n">{r.km}</td><td className="n">{r.transportCost.toLocaleString('en-IN')}</td><td className="n">{r.netProfit.toLocaleString('en-IN')}</td>
          <td><button className="quiet" onClick={() => setHist(r.market_id)}>{t.hist}</button></td></tr>)}</tbody></table></div>
      <p><Callout>{t.hint}</Callout></p>
      {session && <button className="quiet" onClick={setAlert}>{t.alerts}</button>}
      {hist && <TrendChart market={hist} crop={res.crop.id} t={t} />}
    </Panel>}</>;
}

function Alerts({ t, session }) {
  const [a, setA] = useState([]); useEffect(() => { session && api('/alerts', { token: session.token }).then(setA); }, [session]);
  if (!session) return <Panel title={t.alerts}>Log in to set price alerts.</Panel>;
  return <Panel title={t.alerts}><table><tbody>{a.map(x => <tr key={x.id}><td>{x.crop}</td><td className="n">{x.threshold}</td><td className="n">{x.best}</td>
    <td><span className={'pill ' + (x.triggered ? 'green' : 'sky')}>{x.triggered ? 'Reached' : 'Waiting'}</span></td></tr>)}</tbody></table>{!a.length && <p>No alerts yet. Rank a crop, then choose Alerts.</p>}</Panel>;
}

function Subsidy({ t }) {
  const [f, setF] = useState({ landHa: 1, crop: 'Ragi', state: 'Karnataka' }), [r, setR] = useState(null);
  return <Panel title={t.subsidy}>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <input className="field" type="number" step="0.1" value={f.landHa} onChange={e => setF({ ...f, landHa: +e.target.value })} aria-label="Land in hectares" />
      <input className="field" value={f.crop} onChange={e => setF({ ...f, crop: e.target.value })} aria-label="Crop" />
      <input className="field" value={f.state} onChange={e => setF({ ...f, state: e.target.value })} aria-label="State" />
      <button className="cta" onClick={async () => setR(await api('/subsidies/check', { body: f }))}>Check eligibility</button></div>
    {r && <table style={{ marginTop: 16 }}><tbody>{r.map(s => <tr key={s.id}><td>{s.name}<br /><span className="lbl">Bring: {s.checklist.join(', ')}</span></td>
      <td><span className={'pill ' + (s.eligible ? 'green' : 'sky')}>{s.eligible ? 'Likely eligible' : 'Not eligible: ' + s.reasons.join(', ')}</span></td></tr>)}</tbody></table>}
    <p className="lbl">Guidance only. This checklist does not file any application.</p></Panel>;
}

function Admin({ t, session }) {
  const [rows, setRows] = useState([]), [msg, setMsg] = useState(''), [rate, setRate] = useState(0.3), [m, setM] = useState({ name: '', district: '', state: 'Karnataka', lat: '', lng: '' });
  const load = () => api('/admin/prices', { token: session.token }).then(setRows).catch(e => setMsg(e.message)); useEffect(() => { session && load(); }, [session]);
  if (!session || session.role !== 'admin') return <Panel title={t.admin}>Admin login required.</Panel>;
  const tok = session.token, post = (p, body) => api(p, { token: tok, body }).then(r => { setMsg(JSON.stringify(r)); load(); }).catch(e => setMsg(e.message));
  const upload = e => { const form = new FormData(); form.append('file', e.target.files[0]); api('/admin/upload', { token: tok, form }).then(r => { setMsg(`${r.imported} imported, ${r.skipped.length} skipped: ` + r.skipped.map(s => `line ${s.line} ${s.reason}`).join('; ')); load(); }).catch(e => setMsg(e.message)); };
  return <><Panel title={t.admin}>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <label className="lbl">Prices CSV <input type="file" accept=".csv" onChange={upload} /></label>
      <button className="quiet" onClick={() => post('/admin/refresh', {})}>Refresh from API</button>
      <label className="lbl">Transport ₹/q/km <input className="field" type="number" step="0.05" value={rate} onChange={e => setRate(+e.target.value)} style={{ width: 90 }} /></label>
      <button className="quiet" onClick={() => post('/admin/transport-rate', { rate })}>Save rate</button></div>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>{['name', 'district', 'state', 'lat', 'lng'].map(k => <input key={k} className="field" placeholder={k} value={m[k]} onChange={e => setM({ ...m, [k]: e.target.value })} style={{ width: 130 }} />)}
      <button className="quiet" onClick={() => post('/admin/markets', { ...m, lat: +m.lat, lng: +m.lng })}>Add market</button></div>
    {msg && <p className="lbl">{msg}</p>}</Panel>
    <Panel title="Recent prices"><table><tbody>{rows.map(r => <tr key={r.id}><td>{r.market}</td><td>{r.crop}</td><td>{r.date}</td><td className="n">{r.modal}</td>
      <td><button className="quiet" onClick={() => post('/admin/flag/' + r.id, { flagged: !r.flagged })}>{r.flagged ? 'Unflag' : 'Flag bad data'}</button></td></tr>)}</tbody></table></Panel></>;
}

function Login({ onLogin, t }) {
  const [e, setE] = useState(''), [p, setP] = useState(''), [err, setErr] = useState('');
  const go = () => api('/auth/login', { body: { email: e, password: p } }).then(r => onLogin(r)).catch(x => setErr(x.message));
  return <Panel title={t.login}><div data-testid="login-form" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
    <input className="field" placeholder="Email" value={e} onChange={x => setE(x.target.value)} /><input className="field" type="password" placeholder="Password" value={p} onChange={x => setP(x.target.value)} />
    <button className="cta" onClick={go}>{t.login}</button></div>{err && <p><span className="pill sky">{err}</span></p>}
    <p className="lbl">Demo: farmer@agrimandis.in / farmer123, admin@agrimandis.in / admin123</p></Panel>;
}

export default function App() {
  const [lang, setLang] = useState('en'), [tab, setTab] = useState('markets'), [session, setSession] = useState(null), [status, setStatus] = useState('');
  const t = T[lang]; useEffect(() => { api('/status').then(s => setStatus('api ok, latest prices ' + s.latest)).catch(() => setStatus('api unreachable')); }, []);
  return <>
    <header className="band mast" style={{ display: 'flex', alignItems: 'center', height: 56, color: '#faf5e8', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 22, fontWeight: 500 }}>AgriMandis Live</span>
      <nav style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
        {['markets', 'alerts', 'subsidy', 'admin'].map(k => <a key={k} onClick={() => setTab(k)}>{t[k]}</a>)}
        {session ? <a onClick={() => { setSession(null); setTab('markets'); }}>{t.logout}</a> : <a onClick={() => setTab('login')}>{t.login}</a>}
        <button data-testid="lang-toggle" className="quiet" style={{ marginLeft: 20 }} onClick={() => setLang(lang === 'en' ? 'kn' : 'en')}>{lang === 'en' ? 'ಕನ್ನಡ' : 'English'}</button>
      </nav></header>
    <main className="band">
      <h1 className="h1">{t.h1}</h1>
      {tab === 'markets' && <Markets t={t} lang={lang} session={session} />}
      {tab === 'alerts' && <Alerts t={t} session={session} />}
      {tab === 'subsidy' && <Subsidy t={t} />}
      {tab === 'admin' && <Admin t={t} session={session} />}
      {tab === 'login' && <Login t={t} onLogin={s => { setSession(s); setTab('markets'); }} />}
      <section className="panel" style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div><h2 className="h2">{t.stuck}</h2><p style={{ margin: 0 }}>{t.stuckp}</p></div>
        <a className="cta" style={{ marginLeft: 'auto', textDecoration: 'none' }} href="mailto:support@agrimandis.example">{t.contact}</a></section>
      <p className="mono" style={{ color: '#faf5e8' }}>{status}</p>
    </main>
    <footer className="band foot" style={{ color: '#faf5e8', padding: '24px 20px 40px', display: 'flex', gap: 48, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 22, fontWeight: 500 }}>AgriMandis Live</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{['markets', 'alerts', 'subsidy'].map(k => <a key={k} style={{ margin: 0 }} onClick={() => setTab(k)}>{t[k]}</a>)}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><a style={{ margin: 0 }} href="https://data.gov.in">Data source: data.gov.in</a><a style={{ margin: 0 }} href="mailto:support@agrimandis.example">{t.contact}</a></div>
    </footer></>;
}
