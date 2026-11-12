import express from 'express'; import cors from 'cors'; import multer from 'multer';
import jwt from 'jsonwebtoken'; import bcrypt from 'bcryptjs';
import { db, seed } from './db.js';
import { rankMarkets } from './services/ProfitCalculator.js';
import { importCsv, fetchApi } from './services/DataLoader.js';
import { check } from './services/SubsidyChecker.js';
seed();
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const app = express(), up = multer({ storage: multer.memoryStorage() });
app.use(cors(), express.json());
const auth = role => (req, res, next) => {
  try { req.user = jwt.verify((req.headers.authorization || '').slice(7), SECRET); } catch { return res.status(401).json({ error: 'login required' }); }
  if (role && req.user.role !== role) return res.status(403).json({ error: 'admin only' }); next();
};
// auth
app.post('/api/auth/register', (req, res) => { const { email, password } = req.body;
  try { db.prepare('INSERT INTO users(email,hash) VALUES(?,?)').run(email, bcrypt.hashSync(password, 10)); res.json({ ok: true }); }
  catch { res.status(400).json({ error: 'email already registered' }); } });
app.post('/api/auth/login', (req, res) => { const u = db.prepare('SELECT * FROM users WHERE email=?').get(req.body.email);
  if (!u || !bcrypt.compareSync(req.body.password || '', u.hash)) return res.status(401).json({ error: 'wrong email or password' });
  res.json({ token: jwt.sign({ id: u.id, role: u.role }, SECRET, { expiresIn: '7d' }), role: u.role }); });
// search + ranking
const findCrop = q => db.prepare('SELECT * FROM commodities WHERE lower(name)=lower(?) OR name_kn=? OR name_hi=?').get(q, q, q);
app.get('/api/rank', (req, res) => {
  const crop = findCrop(req.query.crop || ''), qty = Number(req.query.qty) || 10, radius = Number(req.query.radius) || 400;
  if (!crop) return res.status(404).json({ error: 'crop not found' });
  const loc = req.query.location || '';
  const origin = db.prepare('SELECT lat,lng,district FROM markets WHERE lower(district) LIKE lower(?) OR district_kn=? LIMIT 1').get(`%${loc}%`, loc);
  if (!origin) return res.status(404).json({ error: 'location not found' });
  const rows = db.prepare(`SELECT m.id market_id,m.name,m.district,m.lat,m.lng,p.modal,p.date FROM prices p JOIN markets m ON m.id=p.market_id
    WHERE p.commodity_id=? AND p.flagged=0 AND p.date=(SELECT MAX(date) FROM prices WHERE market_id=p.market_id AND commodity_id=p.commodity_id AND flagged=0)`).all(crop.id);
  const rate = db.prepare('SELECT per_quintal_km r FROM transport_rates ORDER BY id DESC LIMIT 1').get().r;
  res.json({ crop, origin: origin.district, rate, results: rankMarkets(rows, origin, qty, rate).filter(r => r.km <= radius) });
});
app.get('/api/commodities', (_, res) => res.json(db.prepare('SELECT * FROM commodities').all()));
app.get('/api/prices/history', (req, res) => res.json(db.prepare(
  'SELECT date,modal FROM prices WHERE market_id=? AND commodity_id=? AND flagged=0 ORDER BY date').all(req.query.market, req.query.crop)));
app.post('/api/subsidies/check', (req, res) => res.json(check(db.prepare('SELECT * FROM schemes').all(), req.body)));
// alerts: triggered when today's best modal price >= threshold
app.post('/api/alerts', auth(), (req, res) => { db.prepare('INSERT INTO alerts(user_id,commodity_id,threshold) VALUES(?,?,?)').run(req.user.id, req.body.commodity_id, req.body.threshold); res.json({ ok: true }); });
app.get('/api/alerts', auth(), (req, res) => res.json(db.prepare(`SELECT a.id,c.name crop,a.threshold,
  (SELECT MAX(modal) FROM prices WHERE commodity_id=a.commodity_id AND flagged=0 AND date=(SELECT MAX(date) FROM prices)) best FROM alerts a JOIN commodities c ON c.id=a.commodity_id WHERE user_id=?`).all(req.user.id)
  .map(a => ({ ...a, triggered: a.best >= a.threshold }))));
// admin
app.post('/api/admin/upload', auth('admin'), up.single('file'), (req, res) => { try { res.json(importCsv(req.file.buffer)); } catch (e) { res.status(400).json({ error: 'unreadable CSV: ' + e.message }); } });
app.post('/api/admin/refresh', auth('admin'), async (_, res) => res.json(await fetchApi()));
app.post('/api/admin/markets', auth('admin'), (req, res) => { const m = req.body; db.prepare('INSERT INTO markets(name,district,district_kn,state,lat,lng) VALUES(?,?,?,?,?,?)').run(m.name, m.district, m.district_kn || '', m.state, m.lat, m.lng); res.json({ ok: true }); });
app.post('/api/admin/commodities', auth('admin'), (req, res) => { const c = req.body; db.prepare('INSERT INTO commodities(name,name_kn,name_hi) VALUES(?,?,?)').run(c.name, c.name_kn || '', c.name_hi || ''); res.json({ ok: true }); });
app.post('/api/admin/transport-rate', auth('admin'), (req, res) => { db.prepare('INSERT INTO transport_rates(per_quintal_km) VALUES(?)').run(req.body.rate); res.json({ ok: true }); });
app.post('/api/admin/flag/:id', auth('admin'), (req, res) => { db.prepare('UPDATE prices SET flagged=? WHERE id=?').run(req.body.flagged ? 1 : 0, req.params.id); res.json({ ok: true }); });
app.get('/api/admin/prices', auth('admin'), (_, res) => res.json(db.prepare('SELECT p.id,m.name market,c.name crop,p.date,p.modal,p.flagged FROM prices p JOIN markets m ON m.id=p.market_id JOIN commodities c ON c.id=p.commodity_id ORDER BY p.date DESC LIMIT 50').all()));
app.get('/api/status', (_, res) => res.json({ ok: true, latest: db.prepare('SELECT MAX(date) d FROM prices').get().d }));
app.listen(process.env.PORT || 4000, () => console.log('AgriMandis API on :4000'));
