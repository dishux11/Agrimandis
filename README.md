# AgriMandis Live

A mandi price comparison and sell-decision tool for small farmers in India.

A farmer picks a crop and a place (in English or Kannada). The app shows nearby markets ranked by **net profit**, which is the modal price times the quantity, minus the cost of transporting the produce there. It also shows price history, price alerts, and a simple rule-based guide to which subsidy schemes the farmer may qualify for.

The goal is simple. Farmers who cannot compare today's prices across markets often sell to the nearest middleman. A market that is 80 km away can pay far more than the one next door, even after transport. AgriMandis Live does that arithmetic for them.

> **Status:** working scaffold. The backend and frontend run end to end on seeded demo data. Real mandi data has to be imported (see [Using real market data](#using-real-market-data)). Read [Known limitations](#known-limitations) before putting this in front of real farmers.

---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Getting started](#getting-started)
5. [Demo accounts and seed data](#demo-accounts-and-seed-data)
6. [How to use the app](#how-to-use-the-app)
7. [How ranking works](#how-ranking-works)
8. [Using real market data](#using-real-market-data)
9. [CSV import format](#csv-import-format)
10. [Admin guide](#admin-guide)
11. [API reference](#api-reference)
12. [Database schema](#database-schema)
13. [Configuration](#configuration)
14. [Frontend design system](#frontend-design-system)
15. [Internationalisation](#internationalisation)
16. [Testing](#testing)
17. [Continuous integration](#continuous-integration)
18. [Deployment notes](#deployment-notes)
19. [Security notes](#security-notes)
20. [Troubleshooting](#troubleshooting)
21. [Known limitations](#known-limitations)
22. [Roadmap](#roadmap)
23. [Out of scope](#out-of-scope)
24. [Data sources and licence notes](#data-sources-and-licence-notes)

---

## Features

**Farmer**

- Search by crop and location, for example `Tomato in Dharwad` or `ಟೊಮೇಟೊ ಧಾರವಾಡ`.
- Markets ranked by net profit for the quantity the farmer enters (in quintals).
- Per-market breakdown: modal price, distance in km, transport cost, net profit.
- Price-trend chart (Chart.js) for any market in the results.
- Price alerts: set a target price for a crop and see when it has been reached.
- Subsidy eligibility checker (land size, crop, state) with a document checklist. It never files anything.
- Voice input for the search box using the browser's speech recognition.
- English and Kannada interface, switchable at any time.

**Admin**

- Upload price data as CSV. Bad rows are skipped and reported with line numbers and reasons.
- Refresh prices from a public API (a placeholder for data.gov.in is included).
- Add markets and commodities.
- Set the transport rate used in every calculation.
- Flag bad price rows so they are excluded from rankings, charts and alerts.

**Platform**

- Role-based login (Farmer and Admin) with JWT and bcrypt.
- SQLite database with zero configuration.
- Unit normalisation: prices in kg, quintal or tonne are all stored as rupees per quintal.
- Unit tests for the profit calculator, price normalisation, and structure ready for Selenium end-to-end tests.
- GitHub Actions workflow skeleton.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS 3, Chart.js 4 |
| Backend | Node.js 20+, Express 4 |
| Database | SQLite via `better-sqlite3` |
| Auth | JWT (`jsonwebtoken`) and `bcryptjs` |
| CSV upload and parsing | Multer (in-memory) and `csv-parse` |
| Tests | Node's built-in test runner (`node --test`) |
| CI | GitHub Actions |

---

## Project structure

```
agrimandis/
├── package.json                 Root scripts (dev:api, dev:web, test)
├── README.md
├── sample_prices.csv            Example import file with deliberately bad rows
├── .github/workflows/ci.yml     CI skeleton
├── e2e/README.md                Where Selenium specs will go
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── index.js             Express app, all routes
│   │   ├── db.js                Schema creation and seed data
│   │   └── services/
│   │       ├── ProfitCalculator.js   Distance, transport cost, net profit, ranking
│   │       ├── PriceService.js       Unit normalisation to rupees per quintal
│   │       ├── DataLoader.js         CSV import and API placeholder
│   │       └── SubsidyChecker.js     Rule-based eligibility
│   └── test/
│       └── profit.test.js
└── frontend/
    ├── package.json
    ├── index.html               Loads Plus Jakarta Sans and IBM Plex Mono
    ├── vite.config.js           Proxies /api to the backend on port 4000
    ├── tailwind.config.js       Design tokens (colours, fonts)
    ├── postcss.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx              All screens: Markets, Alerts, Subsidy, Admin, Login
        ├── i18n.js              English and Kannada strings
        └── index.css            The visual system
```

---

## Getting started

### Prerequisites

- Node.js 20 or newer (`node -v` to check).
- npm (ships with Node).
- A C/C++ build toolchain **only if** `better-sqlite3` has no prebuilt binary for your platform:
  - Windows: install "Desktop development with C++" from the Visual Studio Build Tools.
  - Ubuntu/Debian: `sudo apt install build-essential python3`
  - macOS: `xcode-select --install`

### Install

From the project root:

```bash
npm --prefix backend install
npm --prefix frontend install
```

### Run

Use two terminals.

**Terminal 1, backend (port 4000):**

```bash
npm run dev:api
```

The first start creates `backend/agrimandis.db` and loads the seed data. Delete that file to reset everything to the seed state.

**Terminal 2, frontend (port 5173):**

```bash
npm run dev:web
```

Open the address Vite prints, normally <http://localhost:5173>. The Vite dev server forwards every `/api` request to `http://localhost:4000`, so there is nothing to configure.

### Check it works

The status line at the bottom of the page should read `api ok, latest prices <date>`. If it says `api unreachable`, the backend is not running. See [Troubleshooting](#troubleshooting).

---

## Demo accounts and seed data

| Role | Email | Password |
|---|---|---|
| Farmer | `farmer@agrimandis.in` | `farmer123` |
| Admin | `admin@agrimandis.in` | `admin123` |

**Change or delete these before any real deployment.**

The seed creates:

- **6 Karnataka markets:** Hubballi APMC (Dharwad), Davangere APMC, Bengaluru Yeshwanthpur, Mysuru APMC, Belagavi APMC, Raichur APMC.
- **4 crops:** Tomato, Onion, Maize, Ragi, each with Kannada and Hindi names.
- **30 days of prices** per market and crop. These are **synthetic**: a base price per market with a gentle wave applied. They are not real market data.
- **A default transport rate** of ₹0.30 per quintal per km.
- **3 subsidy schemes** with illustrative rules. See [Known limitations](#known-limitations).

---

## How to use the app

### As a farmer

1. Type a crop and place in the search box. Accepted forms:
   - `Tomato in Dharwad` (the word "in" separates crop from place)
   - `ಟೊಮೇಟೊ ಧಾರವಾಡ` (first word is the crop, the rest is the place)
2. Set the quantity in quintals. The default is 10.
3. Press **Rank markets** (or Enter in the search box).
4. Read the table from the top. Rank 1 carries the peach mark and a **Best net** pill: that is the market with the highest net profit.
5. Press **Show trend** on any row to see that market's price history.
6. Log in, then press **Alerts** under a result to set a target price.

The crop can be typed in English, Kannada or Hindi. The place must be a district where at least one market exists in the database, in English or Kannada.

### Voice input

Press **Speak** and say, for example, "Onion Belagavi". The browser fills the search box with what it heard. It uses `en-IN` when the interface is English and `kn-IN` when it is Kannada.

Speech recognition works in Chrome and Edge. Firefox and some mobile browsers do not support it, and the app shows a message instead of failing silently.

### Subsidy checker

1. Open **Subsidy**.
2. Enter land size in hectares, crop and state.
3. Press **Check eligibility**.
4. Each scheme shows either **Likely eligible** or the reasons it does not match, plus a list of documents to bring.

This is guidance only. It does not file anything and it is not an official eligibility decision.

---

## How ranking works

```
netProfit     = modalPrice × quantity − transportCost
transportCost = round(distanceKm × quantity × ratePerQuintalKm)
```

- **modalPrice** is the latest unflagged price for that market and crop, in rupees per quintal.
- **quantity** is in quintals, as entered by the farmer.
- **distanceKm** is the straight-line (haversine) distance from the farmer's district to the market, rounded to whole km.
- **ratePerQuintalKm** is the latest value in the `transport_rates` table. The default is ₹0.30.

Markets are sorted by `netProfit` descending and numbered from 1. Markets farther than the search radius (default 400 km) are dropped.

**Worked example.** A farmer in Dharwad has 10 quintals of tomato.

| Market | Modal ₹/q | Km | Transport ₹ | Net profit ₹ |
|---|---|---|---|---|
| Bengaluru | 2,881 | 368 | 1,104 | 27,706 |
| Hubballi | 2,400 | 0 | 0 | 24,000 |

Bengaluru pays about ₹481 more per quintal, which is ₹4,810 for the load, and costs ₹1,104 to reach. It wins by about ₹3,700. The ranking is by net profit, not by headline price. Sorting by price alone would send farmers to markets that look better but are not.

**Caveats you should tell users about:**

- Distance is a straight line, not road distance. Real roads are longer.
- The transport rate is one flat number for everyone. Real freight varies by vehicle, load size, route and season.
- Modal price is the most common trade price, not a guaranteed price for the farmer's own produce, which depends on grade, moisture and the buyer.
- Mandi fees, commission, loading and hamali charges are not included.

---

## Using real market data

The seed data is synthetic. To show real mandis and prices:

### Where the data comes from

India's daily mandi prices are published through **Agmarknet** (`agmarknet.gov.in`), the government's agricultural marketing information network. It reports minimum, maximum and modal prices per commodity per market, in rupees per quintal, plus arrivals.

There are two routes in.

1. **Download from Agmarknet and upload as CSV (works now).** Use the commodity-wise daily report page, choose state, commodity and date, export it, and reshape the columns into the format in the next section. Upload it under **Admin → Prices CSV**.
2. **data.gov.in API (automatic).** data.gov.in lists a dataset called "Current Daily Price of Various Commodities from Various Markets (Mandi)" generated from Agmarknet. When this was written, that dataset's page said no API existed for it and offered a "Request API" button. Check the current state of the page. If an API is available, get a free key from data.gov.in and implement `fetchApi()` in `backend/src/services/DataLoader.js`: fetch the records, map the fields to the CSV shape below, and pass them through the same import logic.

### Before importing real data

1. **Add the real markets first.** The importer skips any row whose market name is not already in the `markets` table, and reports it as `unknown market`. Add each market in **Admin** with its name, district, state, latitude and longitude. Spell the name exactly as the data source does.
2. **Add the crops.** Rows with an unknown commodity are skipped the same way.
3. **Provide accurate coordinates.** Distance, and therefore transport cost and rank, depends entirely on the latitude and longitude you enter.
4. **Import regularly.** Prices are daily. Stale data produces wrong rankings. The app shows the date of the latest price in the status line at the bottom of every page.

---

## CSV import format

Required header row (column order does not matter; names are case-insensitive and trimmed):

```
market,district,state,commodity,date,modal_price,unit
```

| Column | Meaning |
|---|---|
| `market` | Must match an existing market name exactly (case-sensitive) |
| `district` | Informational |
| `state` | Informational |
| `commodity` | Must match an existing crop name (case-insensitive) |
| `date` | `YYYY-MM-DD` |
| `modal_price` | Number greater than zero |
| `unit` | `quintal`, `qtl`, `kg`, `tonne` or `ton`. If empty, `quintal` is assumed |

**Unit conversion** (everything is stored as rupees per quintal):

| Unit in file | Conversion |
|---|---|
| quintal, qtl | × 1 |
| kg | × 100 |
| tonne, ton | ÷ 10 |

**Duplicate handling:** if a row has the same market, commodity and date as an existing price, the existing price is **overwritten**. This makes re-uploading a corrected file safe.

**Bad rows are skipped, not fatal.** The upload response and the Admin message list each skipped row by line number. Line 1 is the header, so the first data row is line 2. Reasons you may see:

- `missing or invalid price`
- `unknown unit "bag"`
- `unknown crop "Brinjal"`
- `unknown market "..."`

Try `sample_prices.csv`. It contains one good row and three bad ones, so you can see all of this behaviour.

---

## Admin guide

Log in as an admin and open **Admin**.

| Task | How |
|---|---|
| Upload prices | Choose a `.csv` file under **Prices CSV**. The result message says how many rows were imported and which were skipped. |
| Refresh from API | **Refresh from API** calls `fetchApi()`. Until you implement it, it returns a placeholder message. |
| Set the transport rate | Enter rupees per quintal per km and press **Save rate**. The newest rate is used by all rankings immediately. |
| Add a market | Fill name, district, state, lat, lng and press **Add market**. Market names must be unique. |
| Add a commodity | `POST /api/admin/commodities` (no screen yet, see [Known limitations](#known-limitations)). |
| Flag bad data | In **Recent prices**, press **Flag bad data** on a row. Flagged rows are excluded from rankings, history charts and alerts. Press **Unflag** to restore. |

**Spotting bad data:** look for a price that is wildly different from the same crop's price in neighbouring markets on the same day, a price that jumps tenfold from the day before (often a unit mix-up), or a price of exactly zero. Flag it rather than deleting it, so you keep a record.

---

## API reference

All endpoints are under `/api`. Bodies and responses are JSON unless stated. Protected endpoints need the header `Authorization: Bearer <token>`.

### Auth

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password }` | Creates a farmer account. 400 if the email exists. (No UI yet.) |
| POST | `/auth/login` | `{ email, password }` | Returns `{ token, role }`. Token lasts 7 days. 401 on wrong credentials. |

### Search and prices (public)

| Method | Path | Query or body | Notes |
|---|---|---|---|
| GET | `/rank` | `crop`, `location`, `qty` (default 10), `radius` (km, default 400) | Returns `{ crop, origin, rate, results[] }`. 404 if the crop or location is not found. |
| GET | `/commodities` | none | All crops with English, Kannada and Hindi names. |
| GET | `/prices/history` | `market` (id), `crop` (id) | Date-ordered unflagged prices. |
| GET | `/status` | none | `{ ok, latest }` where `latest` is the newest price date. |
| POST | `/subsidies/check` | `{ landHa, crop, state }` | Returns every scheme with `eligible`, `reasons[]` and `checklist[]`. |

Each item in `results[]` has: `rank`, `market_id`, `name`, `district`, `lat`, `lng`, `modal`, `date`, `km`, `transportCost`, `gross`, `netProfit`.

Example:

```bash
curl "http://localhost:4000/api/rank?crop=Tomato&location=Dharwad&qty=10"
```

### Alerts (login required)

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/alerts` | `{ commodity_id, threshold }` | Creates an alert for the logged-in user. |
| GET | `/alerts` | none | The user's alerts with `best` (highest modal price across markets on the newest date) and `triggered` (`best >= threshold`). |

### Admin (admin role required)

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/admin/upload` | multipart form field `file` | CSV import. Returns `{ imported, skipped[] }`. |
| POST | `/admin/refresh` | none | Calls `fetchApi()`. |
| POST | `/admin/markets` | `{ name, district, district_kn?, state, lat, lng }` | |
| POST | `/admin/commodities` | `{ name, name_kn?, name_hi? }` | |
| POST | `/admin/transport-rate` | `{ rate }` | Inserts a new rate; the latest one is used. |
| POST | `/admin/flag/:id` | `{ flagged: true \| false }` | `:id` is the price row id. |
| GET | `/admin/prices` | none | The 50 most recent price rows. |

**Errors** come back as `{ "error": "message" }` with 400, 401, 403 or 404.

---

## Database schema

SQLite file at `backend/agrimandis.db` (override with `DB_FILE`). Tables are created automatically on startup.

| Table | Columns |
|---|---|
| `users` | `id`, `email` (unique), `hash`, `role` (`farmer` or `admin`) |
| `markets` | `id`, `name` (unique), `district`, `district_kn`, `state`, `lat`, `lng` |
| `commodities` | `id`, `name` (unique), `name_kn`, `name_hi` |
| `prices` | `id`, `market_id`, `commodity_id`, `date`, `modal`, `flagged`; unique on (`market_id`, `commodity_id`, `date`) |
| `transport_rates` | `id`, `per_quintal_km` (the highest `id` is the active rate) |
| `alerts` | `id`, `user_id`, `commodity_id`, `threshold` |
| `schemes` | `id`, `name`, `state` (`ALL` or a state), `min_land`, `max_land`, `crops` (`ALL` or comma-separated), `docs` (comma-separated) |

Prices are always stored in **rupees per quintal**.

---

## Configuration

Environment variables for the backend:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port. If you change it, update the proxy target in `frontend/vite.config.js`. |
| `JWT_SECRET` | `dev-secret-change-me` | Signs login tokens. **Must be set to a long random value in production.** |
| `DB_FILE` | `agrimandis.db` | Path to the SQLite file. |

Example:

```bash
JWT_SECRET="$(openssl rand -hex 32)" PORT=4000 npm run dev:api
```

---

## Frontend design system

The interface follows a strict "technical manual" visual system. Please keep to it when adding screens.

**Colour**

| Token | Hex | Use |
|---|---|---|
| Ground | `#0a2e0e` | Page background |
| Cream | `#faf5e8` | Every panel, card and form container |
| Peach | `#fcab79` | Reserved for hotspot marks, connectors and the single primary action. Anything peach must point at something or be the main action. |
| Ink | `#181d26` | Text on cream |
| Rail green | `#214224` | Left rails, hairlines, borders |
| Sky | `#c7e5f2` | Status-pill fills inside data panels only |

Every peach mark and the primary button carry a 1px near-black ring so they stand out from the cream.

**Typography**

- One family: Plus Jakarta Sans, weights **400 and 500 only**. Never 600, 700 or bold.
- Hierarchy comes from size alone: 34px page title, 22px section heads, 15px body, 13px labels and captions.
- IBM Plex Mono appears only for the status line (and step numbers if you add them).

**Layout and form**

- One shared content width (1180px, centred) for every band.
- Flat fills only: no gradients, textures or grids.
- 1px hairline borders; 12px radius on buttons, 16px on panels.
- No sticky bars, no uppercase letter-spaced micro-labels, no drop shadows beyond a very faint one.

**The ranking surface** is meant to read like a data grid, not a set of decorative cards. The top row has a ringed peach mark, and a short connector with an action label ("Sell here: highest net profit") points at it. Use that same mark-connector-label pattern for any new callout.

Classes live in `frontend/src/index.css`: `.panel`, `.field`, `.search`, `.cta`, `.quiet`, `.mark`, `.conn`, `.pill`, `.mono`.

---

## Internationalisation

Strings are in `frontend/src/i18n.js` as two objects, `en` and `kn`. The language toggle in the masthead swaps between them.

To add a string, add the same key to both objects, then use `t.yourKey` in a component.

**What is translated:** navigation, the search placeholder and controls, ranking table headings, the trend chart title, the support panel.

**What is not yet translated:** the subsidy checker, admin screens, login form, error messages from the server, scheme names, and the alert table. There is no Hindi interface yet, although crop names are stored in Hindi and can be searched. Have a native speaker review the Kannada before real use, since it was machine-assisted.

To add Hindi, add an `hi` object to `i18n.js`, add a third option to the toggle in `App.jsx`, and set the speech recognition language to `hi-IN`.

---

## Testing

```bash
npm test
```

This runs the backend suite with Node's built-in runner. It covers:

- net profit arithmetic,
- transport cost,
- that ranking uses net profit and not raw price (a far market with a slightly higher price must lose to a near one),
- unit normalisation, including missing prices and unknown units.

**End-to-end tests:** the `e2e/` folder is reserved for Selenium specs. The UI exposes stable hooks: `data-testid="search"`, `rank-table`, `lang-toggle` and `login-form`. A good first spec is: open the app, type `Tomato in Dharwad`, press Enter, assert the table has 6 rows and that the first row's market has the highest net profit.

---

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request: it installs and tests the backend, then installs and builds the frontend. A placeholder comment marks where to add a Selenium job.

---

## Deployment notes

This scaffold is built for a single server.

1. Build the frontend: `npm --prefix frontend run build`. The output is in `frontend/dist`.
2. Serve `frontend/dist` with any static host or reverse proxy (nginx, Caddy), and forward `/api` to the Node process.
3. Run the backend with `npm --prefix backend start` under a process manager (systemd, pm2, or a container).
4. Set `JWT_SECRET` and a persistent `DB_FILE` path. Back up that file.
5. Terminate HTTPS at the proxy.

SQLite is fine for a pilot with modest traffic. If you need multiple server instances or heavy concurrent writes, move to PostgreSQL. The SQL used is simple, but note that `better-sqlite3` is synchronous, so the data layer would need to become async.

**Scheduling imports:** call the import (or your `fetchApi()` implementation) once a day from a cron job or a scheduler, after the source publishes the day's prices.

---

## Security notes

Do these before exposing the app publicly:

- Set a strong `JWT_SECRET`. The built-in default is public in this repository.
- Delete or change the two demo accounts.
- Add rate limiting on `/auth/login` and `/auth/register` (for example `express-rate-limit`) to slow password guessing.
- Restrict CORS. It is currently open to every origin.
- Serve over HTTPS only.
- Consider moving the login token from in-memory state to an `httpOnly` cookie, and add a token refresh flow.
- Add upload limits to Multer (file size and type) so an admin account cannot be used to exhaust memory.
- Validate input shapes on admin routes (for example with `zod`). Currently they trust the body.

Passwords are hashed with bcrypt (cost 10). All SQL uses parameter binding, so it is not open to SQL injection through the supplied queries.

---

## Troubleshooting

**The status line says `api unreachable`.**
The backend is not running or is on a different port. Start it with `npm run dev:api` and check it prints `AgriMandis API on :4000`.

**`npm install` fails on `better-sqlite3`.**
Install a build toolchain (see [Prerequisites](#prerequisites)) or use Node 20 or 22, which have prebuilt binaries.

**"crop not found" or "location not found".**
The crop or district does not exist in the database. Locations match the **district of a market**, so add a market there first. Check spelling.

**Upload says "unreadable CSV".**
The file is not valid CSV (wrong delimiter, unbalanced quotes) or is missing the header row. Open it in a text editor and compare with `sample_prices.csv`.

**Upload imports nothing and skips every row with `unknown market`.**
Market names in the file must match the `markets` table exactly. Add the markets first, with matching spelling.

**Search results are empty after importing.**
Rankings use only the latest unflagged price per market. If every price for a crop was flagged, or none of its markets are within the radius, the list is empty.

**Voice input does nothing.**
Use Chrome or Edge, allow microphone access, and use HTTPS or `localhost`.

**I changed the seed data and nothing happened.**
Seeding only runs when the `markets` table is empty. Delete `backend/agrimandis.db` and restart.

**Login works but the Admin screen says "Admin login required".**
You are logged in as a farmer. Log in with an admin account.

**The page is logged out after a refresh.**
Expected for now. The login token lives in memory only.

---

## Known limitations

Please read these. Some matter for real-world use.

- **Seed prices are synthetic.** Do not present them as real market information.
- **Subsidy rules are illustrative.** The three seeded schemes and their land, crop and document rules are examples to show how the checker works. They are **not verified against official scheme guidelines**, which change. Check each scheme with the official source and update the `schemes` table before telling any farmer they may be eligible.
- **Straight-line distance** and a **flat transport rate** will over-state profit for far markets. Treat results as an estimate, not a promise.
- **Alert delivery is pull-only.** Alerts show as reached or waiting on the Alerts screen. There is no SMS, email, WhatsApp or push notification, and no way to delete an alert in the UI.
- **Login is not persisted** across page refreshes, and there is no registration screen (the endpoint exists).
- **No Hindi interface**, and Kannada coverage is partial (see [Internationalisation](#internationalisation)).
- **No admin screen for commodities** (the API exists).
- **The data.gov.in import is a stub.**
- **Location search is district-only.** A farmer's village or pincode is not recognised.
- **No pagination or caching.** Fine for a pilot, not for large datasets.
- **Basic accessibility only.** Inputs have labels and focus rings, but the app has not had a full accessibility audit or a screen-reader test.
- **No end-to-end tests yet.**

---

## Roadmap

Reasonable next steps, roughly in priority order:

1. Implement the real data import (Agmarknet / data.gov.in) and a daily scheduler.
2. Load a full list of real markets with accurate coordinates for the target state.
3. Replace straight-line distance with road distance, using a routing service.
4. Make the transport rate depend on vehicle type and load size.
5. Verify and maintain the subsidy scheme data with an official source for each rule.
6. SMS or WhatsApp alerts, since many farmers do not check a website daily.
7. Persistent login, a registration screen, and password reset.
8. Complete Kannada translation, add Hindi, and review both with native speakers.
9. A mobile-first pass tested on low-end Android phones and slow connections.
10. Selenium end-to-end tests in CI.
11. Admin screen for commodities, and an audit log of who flagged or changed what.

---

## Out of scope

Deliberately not included in this project: web scraping, AI agents, real submission of subsidy forms, payments, and a native mobile app.

---

## Data sources and licence notes

- Mandi prices originate from the government's Agmarknet portal and are republished on data.gov.in under its open-data terms. Read the licence on the specific dataset you use and credit the source in your deployment.
- Chart.js, React, Express and the other dependencies are open source under their own licences. Plus Jakarta Sans and IBM Plex Mono are open fonts loaded from Google Fonts.
- Add your own project licence file before publishing this repository.