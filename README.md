# 🏥 MedInfera — Hospital Management System

> A full-featured, multi-tenant Hospital Management System backend powering patient care, doctor workflows, bed management, ambulance dispatch, and financial reporting.

[![Node.js](https://img.shields.io/badge/Node.js-24-green)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5-black)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue)](https://postgresql.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-white)](https://socket.io)

---

## 👥 Team

| Name | Role | Modules |
|------|------|---------|
| **Aditya Singh** | Backend Lead & Team Coordinator | Auth, Hospitals, Doctors, Appointments, Beds/IPD, Payments, Deployment |
| **Priyanshi Mishra** | Backend Developer | Patients, Medicines, Prescriptions, Ambulance Dispatch |
| **Frontend Developer** | React + Tailwind | Frontend UI/UX |
| **Database Designer** | PostgreSQL | Schema Design, Database Architecture |

---

## 🚀 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js 24 | JavaScript server environment |
| Framework | Express.js 5 | HTTP server and routing |
| Database | PostgreSQL 17 (Neon Cloud) | Primary data store |
| Real-time | Socket.io 4 | Live bed and ambulance updates |
| Auth | JWT (jsonwebtoken) | Stateless authentication |
| Validation | Zod | Request input validation |
| Password | bcryptjs | Secure password hashing |
| Payment | Razorpay SDK | Online payment processing |
| QR Code | qrcode | Prescription QR generation |
| Jobs | node-cron | Scheduled background tasks |
| Deployment | Railway | Cloud hosting |

---

## 🏗️ System Architecture
```
Client (React) ←→ Express API ←→ PostgreSQL (Neon)
                      ↕
                  Socket.io (real-time)
                      ↕
              Background Jobs (node-cron)
```

### Multi-Tenant Design
Every hospital has isolated data. The `hospital_id` is injected from the JWT token — never from the request body. A user from Hospital A can never access Hospital B's data.

### Role-Based Access Control
```
SUPER_ADMIN → manages all hospitals on the platform
ADMIN       → manages one hospital
DOCTOR      → own appointments and prescriptions
STAFF       → appointments, beds, ambulance dispatch
PATIENT     → own records and bookings
DRIVER      → own ambulance trips
```

---

## 📦 API Modules

### 🔐 Auth — `/api/auth`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register new user |
| POST | `/login` | Public | Login and get JWT tokens |
| POST | `/refresh` | Public | Refresh access token |
| GET | `/me` | Protected | Get current user profile |
| POST | `/logout` | Protected | Logout |

### 🏥 Hospitals — `/api/hospitals`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | SUPER_ADMIN | List all hospitals with pagination |
| GET | `/stats` | SUPER_ADMIN | Platform-wide statistics |
| GET | `/:id` | SUPER_ADMIN | Get hospital details |
| POST | `/` | SUPER_ADMIN | Create new hospital |
| PUT | `/:id` | SUPER_ADMIN | Update hospital |
| DELETE | `/:id` | SUPER_ADMIN | Soft delete hospital |
| PATCH | `/:id/toggle-status` | SUPER_ADMIN | Activate/deactivate hospital |

### 👨‍⚕️ Doctors — `/api/doctors`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | ADMIN, STAFF, PATIENT | List doctors with search |
| GET | `/:id` | All roles | Get doctor details |
| POST | `/` | ADMIN | Create doctor + user account |
| PUT | `/:id` | ADMIN | Update doctor profile |
| GET | `/:id/schedule` | ADMIN, DOCTOR, STAFF | Get weekly schedule |
| POST | `/:id/schedule` | ADMIN | Set weekly schedule |
| GET | `/:id/slots?date=YYYY-MM-DD` | All roles | Get available time slots |

### 🧑‍🤝‍🧑 Patients — `/api/patients`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | ADMIN, STAFF, DOCTOR | List patients with search |
| GET | `/:id` | ADMIN, STAFF, DOCTOR, PATIENT | Get patient details |
| POST | `/` | ADMIN, STAFF | Register patient + user account |
| GET | `/:id/history` | ADMIN, STAFF, DOCTOR, PATIENT | Appointment history |

### 📅 Appointments — `/api/appointments`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | ADMIN, STAFF, DOCTOR | List with filters (status, date, doctor) |
| GET | `/today?doctor_id=1` | ADMIN, STAFF, DOCTOR | Today's appointments |
| GET | `/:id` | All roles | Get appointment details |
| POST | `/` | ADMIN, STAFF, PATIENT | Book appointment |
| PATCH | `/:id/status` | ADMIN, STAFF, DOCTOR | Update status |

**Status workflow:**
```
PENDING → CONFIRMED → IN_PROGRESS → COMPLETED
        ↘ CANCELLED
        ↘ NO_SHOW
```

### 💊 Medicines — `/api/medicines`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/search?q=paracetamol` | ADMIN, STAFF, DOCTOR | Search medicines |
| GET | `/low-stock` | ADMIN, STAFF | Low stock alerts |
| GET | `/expiring` | ADMIN, STAFF | Expiring in 90 days |
| GET | `/` | ADMIN, STAFF, DOCTOR | List all medicines |
| GET | `/:id` | ADMIN, STAFF, DOCTOR | Get medicine with batches |
| POST | `/` | ADMIN, STAFF | Create medicine |
| POST | `/batches` | ADMIN, STAFF | Add stock batch |

### 📋 Prescriptions — `/api/prescriptions`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | DOCTOR | Create prescription + auto-complete appointment |
| GET | `/:id` | All roles | Get prescription with medicines |
| GET | `/patient/:patientId` | All roles | Patient's prescription history |
| GET | `/verify/:prescriptionNumber` | All roles | Verify by QR code number |

### 🛏️ Beds/IPD — `/api/beds`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/dashboard` | ADMIN, STAFF, DOCTOR | Live bed occupancy dashboard |
| GET | `/available?ward_id=1` | ADMIN, STAFF, DOCTOR | Available beds |
| GET | `/buildings` | ADMIN, STAFF | List buildings |
| POST | `/buildings` | ADMIN | Create building |
| POST | `/floors` | ADMIN | Create floor |
| POST | `/wards` | ADMIN | Create ward |
| POST | `/` | ADMIN | Create bed |
| POST | `/admit` | ADMIN, STAFF | Admit patient to bed |
| PATCH | `/discharge/:allocationId` | ADMIN, STAFF | Discharge patient |
| PATCH | `/:bedId/available` | ADMIN, STAFF | Mark bed as available after cleaning |

**Bed status flow:**
```
AVAILABLE → OCCUPIED (admit) → CLEANING (discharge) → AVAILABLE
          → MAINTENANCE → AVAILABLE
```

### 🚑 Ambulance — `/api/ambulance`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | ADMIN, STAFF | List ambulances |
| POST | `/` | ADMIN | Add ambulance |
| GET | `/drivers` | ADMIN, STAFF | List drivers |
| POST | `/drivers` | ADMIN | Add driver + user account |
| POST | `/trips` | ADMIN, STAFF | Dispatch ambulance |
| GET | `/trips/active` | ADMIN, STAFF | Active trips dashboard |
| PATCH | `/trips/:id/status` | ADMIN, STAFF, DRIVER | Update trip status |

**Trip status flow:**
```
DISPATCHED → ARRIVED → PICKED_UP → TRANSPORTING → COMPLETED
           ↘ CANCELLED
```

**Auto billing on completion:**
```
Total = base_charge + (distance_km × per_km_charge) + (waiting_minutes/60 × waiting_charge_per_hour)
```

### 💰 Payments — `/api/payments`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/cash` | ADMIN, STAFF | Record cash payment |
| POST | `/order` | ADMIN, STAFF, PATIENT | Create Razorpay order |
| POST | `/verify` | ADMIN, STAFF, PATIENT | Verify Razorpay payment |
| GET | `/patient/:patientId` | ADMIN, STAFF, PATIENT | Payment history |
| GET | `/revenue?start_date=&end_date=` | ADMIN | Revenue report |
| GET | `/doctor-payout?doctor_id=&start_date=&end_date=` | ADMIN, DOCTOR | Doctor earnings |

**Revenue split per payment:**
```
Hospital share: 70%
Doctor share:   20%
Platform fee:   10%
```

---

## 📡 Real-time Events (Socket.io)

### Frontend Connection
```javascript
import { io } from 'socket.io-client';

const socket = io('https://medinfera-backend.up.railway.app');

// Join your hospital room
socket.emit('join:hospital', hospitalId);

// Listen for bed updates
socket.on('bed:update', (data) => {
  console.log(data); // { action, bed_id, status }
  // Update bed color on dashboard
});

// Listen for ambulance updates
socket.on('trip:update', (data) => {
  console.log(data); // { action, trip_id, ambulance_id, status }
  // Update ambulance status on dashboard
});
```

### Events Emitted by Server
| Event | Trigger | Payload |
|-------|---------|---------|
| `bed:update` | Patient admitted/discharged | `{ action, bed_id, status }` |
| `trip:update` | Ambulance dispatched/status changed | `{ action, trip_id, ambulance_id, status }` |

---

## 🗄️ Database Schema

**25 tables** across 7 functional areas:
```
Auth & Users:        users, roles
Hospital:            hospitals
Clinical:            doctors, doctor_schedules, patients, appointments
Pharmacy:            medicines, medicine_batches, suppliers, stock_transactions, prescriptions, prescription_medicines
IPD:                 buildings, floors, wards, beds, bed_allocations
Emergency:           ambulances, ambulance_drivers, ambulance_trips
Finance:             payments, payment_gateway_configs, doctor_payouts
Audit:               audit_logs
```

---

## ⚙️ Environment Variables

Create a `.env` file (see `.env.example`):
```env
PORT=5000
NODE_ENV=development

# Neon PostgreSQL
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require

# JWT
JWT_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=7d

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret

# Frontend CORS
FRONTEND_URL=https://your-frontend.vercel.app
```

---

## 🏃 Running Locally
```bash
# Clone the repo
git clone https://github.com/MedInfera/medinfera-backend.git
cd medinfera-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Start development server
npm run dev

# Server runs on http://localhost:5000
# Health check: http://localhost:5000/health
```

---

## 🚢 Deployment (Railway)

1. Connect GitHub repo to Railway
2. Set environment variables in Railway dashboard
3. Railway auto-deploys on every push to `main`

---

## 📁 Project Structure
```
medinfera-backend/
├── src/
│   ├── config/
│   │   ├── db.js          # PostgreSQL connection pool
│   │   ├── env.js         # Environment variable validation
│   │   └── socket.js      # Socket.io setup
│   ├── middleware/
│   │   ├── auth.js        # JWT verification
│   │   ├── roleGuard.js   # Role-based access control
│   │   ├── tenantScope.js # Multi-tenant isolation
│   │   └── errorHandler.js
│   ├── modules/           # One folder per feature
│   │   ├── auth/
│   │   ├── hospitals/
│   │   ├── doctors/
│   │   ├── patients/
│   │   ├── appointments/
│   │   ├── medicines/
│   │   ├── prescriptions/
│   │   ├── beds/
│   │   ├── ambulance/
│   │   └── payments/
│   ├── shared/
│   │   ├── response.js    # Standard API response format
│   │   ├── paginate.js    # Pagination helper
│   │   ├── auditLog.js    # Audit logging
│   │   └── generateNumber.js
│   ├── sockets/           # Socket.io event handlers
│   ├── jobs/              # Background scheduled jobs
│   └── app.js             # Express app setup
├── server.js              # Entry point
├── .env.example           # Environment template
└── railway.toml           # Railway deployment config
```

---

## 🔒 Security Features

- JWT with short-lived access tokens + long-lived refresh tokens
- bcrypt password hashing (12 rounds)
- Hospital-scoped tenant isolation — cross-hospital data access impossible
- Zod input validation on all endpoints
- Helmet.js security headers
- CORS restricted to frontend URL
- Soft deletes — data never permanently lost
- Audit logging on all critical operations

---

## 📊 Key Business Logic

### Appointment Slot Management
- Doctor schedules defined by day of week
- Slots auto-generated based on `slot_duration`
- Break times automatically excluded
- Unique constraint prevents double booking

### Prescription System
- Doctor creates prescription → appointment auto-marked COMPLETED
- QR code generated for each prescription
- Medicines linked with dosage, frequency, duration
- Verify prescription by scanning QR code

### Bed Management
- Building → Floor → Ward → Bed hierarchy
- Real-time occupancy broadcast via Socket.io
- Auto charge calculation on discharge

### Payment Processing
- Razorpay for online payments (UPI, Cards)
- Cash payments recorded directly
- Revenue automatically split: 70/20/10
- Doctor payout reports by date range