# MedInfera — Hospital Management SaaS Backend

Production-grade backend API for a multi-hospital SaaS platform.

---

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL (Neon)
- **Auth**: JWT (Access + Refresh tokens)
- **Real-time**: Socket.io
- **Jobs**: node-cron
- **Logging**: Winston

---

## Quick Start

```bash
# 1. Clone and install
npm install

# 2. Setup environment
cp .env.example .env
# Fill in your Neon DATABASE_URL and JWT secrets

# 3. Generate Prisma client
npm run db:generate

# 4. Start development server
npm run dev
```

---

## Environment Variables

See `.env.example` for all required variables.

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (min 32 chars) |
| `SUPER_ADMIN_EMAIL` | Email for the seeded platform admin |
| `SUPER_ADMIN_PASSWORD` | Password for the seeded platform admin |

---

## API Base URL

```
http://localhost:5000/api/v1
```

---

## Modules & Endpoints

| Module | Base Path |
|---|---|
| Auth | `/api/v1/auth` |
| Hospitals | `/api/v1/hospitals` |
| Users | `/api/v1/users` |
| Doctors | `/api/v1/doctors` |
| Patients | `/api/v1/patients` |
| Appointments | `/api/v1/appointments` |
| Beds & Wards | `/api/v1/beds` |
| IPD | `/api/v1/ipd` |
| Medicines | `/api/v1/medicines` |
| Prescriptions | `/api/v1/prescriptions` |
| Lab | `/api/v1/lab` |
| Invoices & Payments | `/api/v1/invoices` |
| Ambulance | `/api/v1/ambulance` |
| Payouts & Payroll | `/api/v1/payouts` |
| Notifications | `/api/v1/notifications` |

---

## Auth Flow

```
POST /api/v1/auth/login       → { accessToken, refreshToken, user }
POST /api/v1/auth/refresh     → { accessToken, refreshToken }
POST /api/v1/auth/logout      → revokes refresh token
GET  /api/v1/auth/me          → current user profile
PATCH /api/v1/auth/change-password
```

All protected routes require:
```
Authorization: Bearer <accessToken>
```

---

## Role Hierarchy

```
SUPER_ADMIN  → Platform owner, manages all hospitals
ADMIN        → Hospital-level admin
DOCTOR       → Clinical staff
NURSE        → Ward/IPD nursing
RECEPTIONIST → Scheduling, registration
PHARMACIST   → Medicine dispensing
LAB_TECHNICIAN → Lab orders & results
BILLING      → Invoices & payments
DRIVER       → Ambulance GPS tracking
PATIENT      → Self-service access
STAFF        → General hospital staff
```

---

## Real-time Events (Socket.io)

Connect with:
```js
const socket = io('http://localhost:5000', {
  auth: { token: '<accessToken>' }
});
```

| Event | Direction | Description |
|---|---|---|
| `appointment:new` | Server → Client | New appointment booked |
| `appointment:status_update` | Server → Client | Status changed |
| `ipd:admitted` | Server → Client | Patient admitted |
| `ipd:discharged` | Server → Client | Patient discharged |
| `lab:results_ready` | Server → Client | Lab results entered |
| `invoice:issued` | Server → Client | Invoice issued |
| `payment:received` | Server → Client | Payment recorded |
| `ambulance:dispatched` | Server → Client | Ambulance sent |
| `ambulance:location_update` | Server → Client | GPS ping |
| `alert:medicine_expiry` | Server → Client | Expiry alert |
| `alert:low_stock` | Server → Client | Low stock alert |

---

## Background Jobs

| Job | Schedule | Description |
|---|---|---|
| Medicine Expiry Check | Daily 7 AM | Alerts for batches expiring in 30 days |
| Low Stock Check | Daily 8 AM | Alerts when stock ≤ reorder level |
| Appointment Reminders | Hourly | Notifies patients of next-day appointments |
| Invoice Overdue | Daily 9 AM | Marks unpaid invoices as OVERDUE |
| Bed Auto-Release | Every 30 min | Releases reserved beds with no admission |

---

## Health Check

```
GET /health
```

---

## Project Structure

```
src/
├── config/          # DB, logger, socket, env config
├── middleware/       # auth, rbac, validation, error handler
├── modules/          # Feature modules (routes + service + validation)
│   ├── auth/
│   ├── hospitals/
│   ├── users/
│   ├── doctors/
│   ├── patients/
│   ├── appointments/
│   ├── beds/
│   ├── ipd/
│   ├── medicines/
│   ├── prescriptions/
│   ├── lab/
│   ├── invoices/
│   ├── ambulance/
│   ├── payouts/
│   └── notifications/
├── jobs/             # node-cron background jobs
├── utils/            # response, pagination, tokens, codes, audit
├── app.js            # Express app
└── server.js         # HTTP + Socket.io + bootstrap
prisma/
└── schema.prisma     # Full ORM schema
```
