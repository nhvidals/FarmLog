# Farm Animals Mobile App (iOS + Android)

Farm and livestock management app with support for:

- Animal records with photo, birth date, sex, designation, category (oviparous/viviparous), and ring number
- Animal lifecycle status (active / sold / deceased) with status date and reason
- Home dashboard: headline counts and a 7-day upcoming-events feed
- Animal list search, status/sex filters, and sorting (newest / name / ring)
- In-app calendar date pickers for all date fields (no manual typing)
- Pull-to-refresh with loading, empty, and error/retry states
- Animal genealogy tree (father/mother)
- Egg incubation management with scheduled notifications
- Medication scheduling with scheduled notifications
- MongoDB persistence
- Multi-farm support (data isolated per farm)
- JSON data import and export
- Language selector: Portuguese (PT) / English (EN)

## Project Structure

```
.                        API — Node.js + Express + Mongoose
./src
  routes/                Express routers (farms, animals, incubation, medication, data)
  models/                Mongoose models
  utils/                 Shared utilities (farmContext)
  types/                 Domain types
  __tests__/             Integration tests (Jest + Supertest)
./app                    Mobile app — React Native + Expo
./app/src
  api.ts                 Axios client factory
  types.ts               Shared domain types
  i18n.ts                PT/EN translations
```

## Requirements

- Node.js 20+
- MongoDB (local or remote)
- Expo Go (or Android/iOS emulator)

---

## API Setup

1. Install dependencies:

```bash
npm install
```

2. Set `MONGODB_URI` in a `.env` file if needed (defaults to `mongodb://localhost:27017/farm_animals`).

3. Run in development:

```bash
npm run dev
```

4. Production build:

```bash
npm run build
npm start
```

The API starts on `http://localhost:4000` by default.

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | public | Create an account, returns a JWT |
| POST | `/auth/login` | public | Log in, returns a JWT |
| GET / POST / DELETE | `/farms` | required | List / create / delete the caller's farms |
| GET / POST | `/farms/:id/members` | required | List farm members / add a member by email (owner only) |
| PUT / DELETE | `/farms/:id/members/:userId` | required | Change a member's role / remove a member (owner only) |
| GET / POST / PUT / DELETE | `/animals` | required | Animal CRUD |
| GET | `/animals/:id/tree` | required | Genealogy tree |
| GET / POST / PUT / DELETE | `/incubation` | required | Incubation batch CRUD |
| GET / POST / PUT / DELETE | `/medication` | required | Medication schedule CRUD |
| GET | `/data/export` | required | Export farm data as JSON |
| POST | `/data/import` | required | Import JSON data into a farm |

### Authentication

All endpoints except `/auth/*` and `/health` require a bearer token:

```
Authorization: Bearer <jwt>
```

Obtain a token from `POST /auth/register` or `POST /auth/login`. Tokens are signed
with `JWT_SECRET` (required env var) and expire after `JWT_TTL` (default 30 days).

### Multi-farm

Data endpoints take a `farmId`, supplied as:

- Header: `x-farm-id: <id>`
- Query param: `?farmId=<id>`

The server verifies the caller has access to that farm and returns `404` for
farms that don't exist **or** that the caller isn't a member of (the difference
is not disclosed). The mobile app sends both the token and the active farm id
automatically.

### Members & roles

A farm has one **owner** (its creator) and any number of invited members. Each
member has a role that gates what they can do:

| Role | Read data | Write data (create/edit/delete) | Manage members / delete farm |
|---|:---:|:---:|:---:|
| `owner` | ✅ | ✅ | ✅ |
| `worker` | ✅ | ✅ | — |
| `vet` | ✅ | — (writes return `403`) | — |

The owner adds members by email via `POST /farms/:id/members` (the user must
already have an account). `GET /farms` returns each farm annotated with the
caller's `role`, which the app uses to hide actions the role can't perform.
Ownership is not transferable through the members API — only `worker` and `vet`
are assignable.

---

## Tests

Integration tests use Jest + Supertest + MongoDB Memory Server — no running database required.

```bash
npm test
```

Test suites in `src/__tests__/` cover all routes: farms, animals (including the genealogy tree), incubation, medication, and import/export (72 tests).

---

## Mobile App Setup

```bash
cd app
npm install
npm start
```

Then:

- Press `a` for Android
- Press `i` for iOS (macOS only)
- Scan the QR code with Expo Go

### Connecting to the API

Set the **API Base URL** field at the top of the app:

| Environment | URL |
|---|---|
| Android Emulator | `http://10.0.2.2:4000` |
| iOS Simulator | `http://localhost:4000` |
| Physical device | `http://<YOUR_LOCAL_IP>:4000` |

### Language

Tap **PT** or **EN** in the top-right corner to switch languages. All labels, buttons, alerts, and notifications update instantly.

### Mobile Regression Checks

Use [app/REGRESSION_TEST_PLAN.md](app/REGRESSION_TEST_PLAN.md) for the manual regression checklist that covers:

- Active farm reselection after deletion
- Import/export farm-selection guards
- Safe handling of invalid date values in UI rendering
- Sharing availability fallback behavior

---

## Notes

- **Medications can recur.** A schedule has a `frequency` (`once` / `daily` / `weekly` / `monthly`), an `interval` (every N units), and an optional `endDate`. `once` is the default and matches the original one-off behaviour. The API validates that `endDate` is not before `date`.
- **Reminders are local and re-derived from data.** The app re-schedules upcoming reminders (recurring medication doses + incubation hatch dates) for the active farm on every launch and whenever that data changes, so they survive an app relaunch/reinstall. They are best-effort local notifications (no server push), a no-op on web, and cover the active farm only.
- Import/export uses JSON files matching the structure returned by `GET /data/export`. Strip `_id` fields when importing into a different farm to avoid duplicate key conflicts.
- Animal photos use the device's local URI (MVP). For production use remote storage (S3, Cloudinary, etc.).
