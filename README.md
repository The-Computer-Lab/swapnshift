# SwapNShift

A shift-swap management web app built by G. Rhodes, specifically for AGR grafters. Staff can post shifts they need covered, colleagues can accept them, and an admin approves new registrations before anyone can log in.

Live at **[www.swapnshift.com](https://www.swapnshift.com)**

---

## What it does

- **Landing page** — public-facing home page with a "How does it work?" step guide, Sign in, and Register buttons. Logged-in users see their name and a "Go to app" button instead.
- **Register / Login** — staff register with their first name, last name, email, password, and shift group (J/K/L/M/N). New accounts are locked until an admin approves them. Admin receives an email notification on each new registration.
- **6-month rota calendar** — the home screen shows a colour-coded 6-month calendar (Day/Night/Off) for the logged-in user's shift group, plus a 14-day quick-glance strip.
- **Swap board** — staff post shifts they need covered (single day or date range, Day or Night). Colleagues can accept open swaps. The poster can remove their own request.
- **Two-way swap workflow** — accepting a swap requires a counter-offer (a shift you'd like covered in return). The original poster then confirms or rejects the deal. Emails are sent at each step.
- **Swap history** — the History tab shows all completed swaps from the last 12 months.
- **Profile** — users can update their name, email, shift group, and password.
- **Email notifications** — triggered at each key event: new registration (admin), account approved (user), new swap posted (all users), counter-offer received, swap confirmed, counter-offer rejected.
- **Admin panel** — admins can list pending users (with badge count), approve or reject them, list all users, and delete accounts.

---

## Tech stack

### Backend
| Package | Version | Purpose |
|---|---|---|
| Node.js | system | Runtime |
| Express | ^5.2.1 | HTTP server and routing |
| @supabase/supabase-js | ^2.103.0 | Database client |
| bcryptjs | ^3.0.3 | Password hashing |
| jsonwebtoken | ^9.0.3 | JWT auth tokens |
| express-rate-limit | ^8.3.2 | Brute-force protection on auth endpoints |
| resend | ^6.10.0 | Transactional email |
| dotenv | ^17.4.1 | Loading `.env` variables |
| cors | ^2.8.6 | Restricting frontend origins |

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React | ^19.2.4 | UI framework |
| Vite | ^8.0.4 | Dev server and build tool |
| @vitejs/plugin-react | ^6.0.1 | React/JSX support |

### External services
| Service | What it's used for |
|---|---|
| **Supabase** | Hosted Postgres database |
| **Resend** | Transactional email (verified domain: swapnshift.com) |
| **Cloudflare** | Domain registrar and DNS |
| **Vercel** | Frontend and backend hosting |

---

## Project structure

```
shiftswap/
├── backend/
│   ├── index.js                  # Express app entry point (CORS, rate limiting)
│   ├── .env                      # Secret keys (never commit this)
│   ├── middleware/
│   │   └── auth.js               # authenticateToken + requireAdmin
│   ├── routes/
│   │   ├── auth.js               # POST /api/auth/register, /login · PUT /profile
│   │   ├── swaps.js              # Full swap workflow including counter-offers
│   │   └── admin.js              # GET/PUT/DELETE /api/admin/users/*
│   └── utils/
│       └── email.js              # All email functions (Resend)
└── frontend/
    ├── index.html
    └── src/
        ├── main.jsx              # React entry point
        ├── App.jsx               # Router: Landing / Login / Register / Home / Admin
        ├── api.js                # All fetch calls to the backend API
        ├── index.css             # All styles
        ├── components/
        │   └── HowToUse.jsx      # Step-by-step guide modal
        └── screens/
            ├── Landing.jsx       # Public landing page
            ├── Login.jsx         # Sign-in form
            ├── Register.jsx      # Registration form (first + last name)
            ├── Home.jsx          # Rota / Swaps / History / Profile tabs + bottom nav
            └── Admin.jsx         # Pending approvals + all users panel
```

---

## Environment variables

Create `backend/.env` with these values (all required):

```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret
RESEND_API_KEY=re_your_resend_api_key
ADMIN_EMAIL=your_admin_email@example.com
```

---

## Database setup (Supabase)

Run these in the **Supabase SQL editor**:

```sql
-- Users table
create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password text not null,
  shift text,                          -- J, K, L, M, or N
  role text not null default 'user',   -- 'user' or 'admin'
  status text not null default 'pending', -- 'pending', 'approved', 'rejected'
  created_at timestamptz default now()
);

-- Swaps table
create table swaps (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references users(id),
  acceptor_id uuid references users(id),
  shift_date date not null,
  shift_time text not null,            -- 'Day' or 'Night'
  notes text,
  status text not null default 'open', -- 'open', 'pending_confirmation', 'accepted', 'declined'
  counter_date date,
  counter_shift_time text,
  created_at timestamptz default now()
);
```

To create the first admin, register normally then run:

```sql
update users set role = 'admin', status = 'approved' where email = 'your@email.com';
```

---

## Running locally

Two terminals required.

**Terminal 1 — backend**
```bash
cd shiftswap/backend
npm install
node index.js
# Runs on http://localhost:3000
```

**Terminal 2 — frontend**
```bash
cd shiftswap/frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

Open **http://localhost:5173**.

> **Tip:** If you get a stale process on port 3000 after a crash, kill it with:
> ```bash
> kill -9 $(lsof -t -i :3000)
> ```

---

## API endpoints

### Auth — `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Register (status starts as `pending`). Rate limited. |
| POST | `/login` | No | Login — returns JWT valid 7 days. Rate limited. |
| PUT | `/profile` | JWT | Update name, email, shift, or password |

### Swaps — `/api/swaps`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | JWT | Get all open swaps |
| POST | `/` | JWT | Post a new swap request |
| GET | `/pending` | JWT | Get pending_confirmation swaps involving the current user |
| GET | `/history` | JWT | Get accepted swaps from the last 12 months |
| PUT | `/:id/accept` | JWT | Offer to cover, with a counter-shift |
| PUT | `/:id/confirm` | JWT | Requester confirms the counter-offer |
| PUT | `/:id/reject-counter` | JWT | Requester rejects the counter-offer (swap returns to open) |
| PUT | `/:id/decline` | JWT | Requester removes their own open swap |

### Admin — `/api/admin` (admin role required)
| Method | Path | Description |
|---|---|---|
| GET | `/users/pending` | List pending registrations |
| PUT | `/users/:id/approve` | Approve a user (sends welcome email) |
| PUT | `/users/:id/reject` | Reject a registration |
| GET | `/users` | List all users |
| DELETE | `/users/:id` | Delete a user (removes their swaps first) |

---

## Shift rota logic

Calculated entirely in the frontend — no database involved.

**Cycle:** 2 days on → 2 nights on → 6 days off (10-day repeating cycle)

**Anchor dates:**
| Shift | Anchor |
|---|---|
| K | 2025-05-28 |
| J | 2025-05-30 |
| L | 2025-06-01 |
| M | 2025-06-03 |
| N | 2025-06-05 |

Position 0–1 → Day, 2–3 → Night, 4–9 → Off.

---

## Swap workflow

```
open → (acceptor offers counter) → pending_confirmation → (requester confirms) → accepted
                                                        → (requester rejects)  → open
```

1. Requester posts a swap (status: `open`)
2. A colleague offers to cover it and proposes a counter-shift (status: `pending_confirmation`)
3. Requester accepts → status becomes `accepted`, both parties emailed
4. Requester declines → status returns to `open`, counter-offer party emailed

---

## Auth flow

1. Login → backend issues a JWT signed with `JWT_SECRET`, valid 7 days
2. JWT stored in `localStorage`
3. Every API request sends `Authorization: Bearer <token>`
4. Backend middleware verifies and extracts user details — no DB lookup per request
5. On page refresh, `App.jsx` decodes the token from localStorage
6. Expired token → silently logged out

---

## Email notifications

Sent via **Resend** from `noreply@swapnshift.com` (verified domain). All user-supplied content is HTML-escaped before insertion into email templates.

| Trigger | Recipients |
|---|---|
| New registration | Admin (`ADMIN_EMAIL`) |
| Account approved | The new user |
| New swap posted | All approved users except the poster |
| Counter-offer made | The original requester |
| Swap confirmed | Both parties |
| Counter-offer rejected | The person who made the offer |

Calls are fire-and-forget — a failed send logs to console but doesn't affect the API response.

---

## Security

- **CORS** locked to `www.swapnshift.com`, `swapnshift.vercel.app`, and `localhost:5173`
- **Rate limiting** on `/register` and `/login` — 20 requests per 15 minutes per IP
- **Passwords** hashed with bcrypt (10 rounds)
- **JWTs** verified server-side on every protected request
- **Admin routes** require both a valid JWT and `role === 'admin'`
- **Input validation** on register — name, email, password (min 6 chars), valid shift group
- **HTML escaping** on all user-supplied content in email templates
- **Service role key** only used on the backend, never exposed to the frontend
- **`.env` excluded** from git via `.gitignore`

---

## Deploying the backend (Vercel)

1. Go to **vercel.com** and sign in with GitHub
2. Click **Add New Project** and import the `swapnshift` repo
3. Set the **Root Directory** to `backend`
4. Add all environment variables from `backend/.env` under **Settings → Environment Variables**
5. Click **Deploy** — once live, copy the public URL
6. Update `VITE_API_URL` in the frontend project's environment variables to the backend URL

---

## Deploying the frontend (Vercel)

1. Go to **vercel.com** and sign in with GitHub
2. Click **Add New Project** and import the `swapnshift` repo
3. Set the **Root Directory** to `frontend`
4. Add environment variable: `VITE_API_URL` = your backend Vercel URL
5. Click **Deploy**

---

## Live URLs

| Service | URL |
|---|---|
| App | https://www.swapnshift.com |
| Frontend (Vercel) | https://swapnshift.vercel.app |
| Backend API (Vercel) | https://swapnshift-backend.vercel.app |

---

## Known gotchas

- **Stale process on port 3000** — if the server was started days ago and never stopped, it runs the old code even after file edits. Kill it and restart.
- **Stale JWT after field rename** — `App.jsx` handles `crew→shift` token normalisation automatically, but the clean fix is to sign out and back in.
- **Service role key** — `SUPABASE_SERVICE_KEY` bypasses Supabase row-level security. Backend only, never expose in frontend.
- **No HTTPS locally** — fine for development. Production uses HTTPS via Vercel.
- **JWT in localStorage** — accessible to JavaScript on the page. Acceptable for this use case; the alternative (httpOnly cookies) would require additional CORS and cookie configuration across domains.

---

## Planned improvements

- PWA support (add to home screen on Android and iOS)
- Profile avatars
