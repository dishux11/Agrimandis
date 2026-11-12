import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
export const db = new Database(process.env.DB_FILE || 'agrimandis.db');
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE, hash TEXT, role TEXT DEFAULT 'farmer');
CREATE TABLE IF NOT EXISTS markets(id INTEGER PRIMARY KEY, name TEXT UNIQUE, district TEXT, district_kn TEXT, state TEXT, lat REAL, lng REAL);
CREATE TABLE IF NOT EXISTS commodities(id INTEGER PRIMARY KEY, name TEXT UNIQUE, name_kn TEXT, name_hi TEXT);
CREATE TABLE IF NOT EXISTS prices(id INTEGER PRIMARY KEY, market_id INT, commodity_id INT, date TEXT, modal REAL, flagged INT DEFAULT 0, UNIQUE(market_id,commodity_id,date));
CREATE TABLE IF NOT EXISTS transport_rates(id INTEGER PRIMARY KEY, per_quintal_km REAL);
CREATE TABLE IF NOT EXISTS alerts(id INTEGER PRIMARY KEY, user_id INT, commodity_id INT, threshold REAL);
CREATE TABLE IF NOT EXISTS schemes(id INTEGER PRIMARY KEY, name TEXT, state TEXT, min_land REAL, max_land REAL, crops TEXT, docs TEXT);
`);
export function seed() {
  if (db.prepare('SELECT COUNT(*) c FROM markets').get().c) return;
  const M = [['Hubballi APMC','Dharwad','ಧಾರವಾಡ',15.36,75.12],['Davangere APMC','Davangere','ದಾವಣಗೆರೆ',14.47,75.92],['Bengaluru Yeshwanthpur','Bengaluru','ಬೆಂಗಳೂರು',13.02,77.54],['Mysuru APMC','Mysuru','ಮೈಸೂರು',12.30,76.64],['Belagavi APMC','Belagavi','ಬೆಳಗಾವಿ',15.85,74.50],['Raichur APMC','Raichur','ರಾಯಚೂರು',16.21,77.36]];
  const C = [['Tomato','ಟೊಮೇಟೊ','टमाटर',[2400,2100,2800,2300,2000,1900]],['Onion','ಈರುಳ್ಳಿ','प्याज',[1800,1650,2050,1700,1900,1500]],['Maize','ಮೆಕ್ಕೆಜೋಳ','मक्का',[2150,2250,2100,2050,2200,2300]],['Ragi','ರಾಗಿ','रागी',[3800,3650,3900,4050,3700,3600]]];
  const im = db.prepare('INSERT INTO markets(name,district,district_kn,state,lat,lng) VALUES(?,?,?,?,?,?)');
  M.forEach(m => im.run(m[0], m[1], m[2], 'Karnataka', m[3], m[4]));
  const ic = db.prepare('INSERT INTO commodities(name,name_kn,name_hi) VALUES(?,?,?)'), ip = db.prepare('INSERT INTO prices(market_id,commodity_id,date,modal) VALUES(?,?,?,?)');
  C.forEach((c, ci) => { ic.run(c[0], c[1], c[2]); for (let d = 0; d < 30; d++) { const dt = new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
    c[3].forEach((p, mi) => ip.run(mi + 1, ci + 1, dt, Math.round(p * (1 + Math.sin((d + mi) / 4) * 0.06)))); } });
  db.prepare('INSERT INTO transport_rates(per_quintal_km) VALUES(0.3)').run();
  const is = db.prepare('INSERT INTO schemes(name,state,min_land,max_land,crops,docs) VALUES(?,?,?,?,?,?)');
  is.run('PM-KISAN income support','ALL',0.01,2,'ALL','Aadhaar,Land record (RTC),Bank passbook');
  is.run('Karnataka Raitha Siri (millets)','Karnataka',0.01,null,'Ragi,Maize','Aadhaar,RTC,Bank passbook,Crop sowing certificate');
  is.run('Micro-irrigation subsidy','Karnataka',0.2,5,'ALL','Aadhaar,RTC,Water source proof');
  const iu = db.prepare('INSERT INTO users(email,hash,role) VALUES(?,?,?)');
  iu.run('admin@agrimandis.in', bcrypt.hashSync('admin123', 10), 'admin');
  iu.run('farmer@agrimandis.in', bcrypt.hashSync('farmer123', 10), 'farmer');
}
