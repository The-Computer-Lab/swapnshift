# SwapNShift

A shift-swap management web app built by G. Rhodes, specifically for AGR grafters. Staff can post shifts they need covered, colleagues can accept them, and an admin approves new registrations before anyone can log in.

---

## What it does

- **Landing page** — public-facing home page explaining the app, with Sign in and Register buttons. Logged-in users see their name and a "Go to app" button instead.
- **Register / Login** — staff register with their name, email, password, and shift group (J/K/L/M/N). New accounts are locked until an admin approves them.
- **6-month rota calendar** — the home screen shows a colour-coded 6-month calendar (Day/Night/Off) for the logged-in user's shift group, plus a 14-day quick-glance strip.
- **Swap board** — staff post shifts they need covered (single day or date range, Day or Night). Colleagues can accept open swaps. The poster can remove their own request.
- **Email notifications** — approval triggers a welcome email; posting a swap notifies all other approved users.
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
| resend | ^6.10.0 | Transactional email |
| dotenv | ^17.4.1 | Loading `.env` variables |
| cors | ^2.8.6 | Allowing frontend to call the API |

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

---

## Project structure

```
shiftswap/
├── backend/
│   ├── index.js                  # Express app entry point
│   ├── .env                      # Secret keys (never commit this)
│   ├── middleware/
│   │   └── auth.js               # authenticateToken + requireAdmin
│   ├── routes/
│   │   ├── auth.js               # POST /api/auth/register, /login
│   │   ├── swaps.js              # GET/POST /api/swaps, PUT accept|decline
│   │   └── admin.js              # GET/PUT/DELETE /api/admin/users/*
│   └── utils/
│       └── email.js              # sendWelcomeEmail, sendSwapNotificationEmail
└── frontend/
    ├── index.html
    └── src/
        ├── main.jsx              # React entry point
        ├── App.jsx               # Router: Landing / Login / Register / Home / Admin
        ├── api.js                # All fetch calls to the backend API
        ├── index.css             # All styles
        └── screens/
            ├── Landing.jsx       # Public landing page
            ├── Login.jsx         # Sign-in form
            ├── Register.jsx      # Registration form
            ├── Home.jsx          # 14-day rota strip, 6-month calendar, swap board
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
  status text not null default 'open', -- 'open', 'accepted', 'declined'
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
| POST | `/register` | No | Register (status starts as `pending`) |
| POST | `/login` | No | Login — returns JWT valid 7 days |

### Swaps — `/api/swaps`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | JWT | Get all open swaps |
| POST | `/` | JWT | Post a new swap request |
| PUT | `/:id/accept` | JWT | Accept a swap |
| PUT | `/:id/decline` | JWT | Remove your own swap |

### Admin — `/api/admin` (admin role required)
| Method | Path | Description |
|---|---|---|
| GET | `/users/pending` | List pending registrations |
| PUT | `/users/:id/approve` | Approve a user (sends welcome email) |
| PUT | `/users/:id/reject` | Reject a registration |
| GET | `/users` | List all users |
| DELETE | `/users/:id` | Delete a user |

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

## Auth flow

1. Login → backend issues a JWT signed with `JWT_SECRET`, valid 7 days
2. JWT stored in `localStorage`
3. Every API request sends `Authorization: Bearer <token>`
4. Backend middleware verifies and extracts user details — no DB lookup per request
5. On page refresh, `App.jsx` decodes the token from localStorage
6. Expired token → silently logged out

---

## Email notifications

Sent via **Resend** from `noreply@swapnshift.com` (verified domain).

- **Welcome email** — fired when admin approves a user
- **Swap notification** — fired when a new swap is posted; sent to all approved users except the poster

Calls are fire-and-forget — a failed send logs to console but doesn't affect the API response.

---

## Deploying to GitHub

```bash
cd shiftswap
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/swapnshift.git
git branch -M main
git push -u origin main
```

Make sure `backend/.env` is listed in `.gitignore` — never commit secrets.

---

## Known gotchas

- **Stale process on port 3000** — if the server was started days ago and never stopped, it runs the old code even after file edits. Kill it and restart.
- **Stale JWT after field rename** — `App.jsx` handles `crew→shift` token normalisation automatically, but the clean fix is to sign out and back in.
- **Service role key** — `SUPABASE_SERVICE_KEY` bypasses Supabase row-level security. Backend only, never expose in frontend.
- **No HTTPS locally** — fine for development. In production use HTTPS and consider `httpOnly` cookies for token storage.
