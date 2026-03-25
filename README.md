# MedInfera Backend API

A scalable, production-ready Hospital Management SaaS backend built with **Node.js**, **Express**, **Prisma**, and **PostgreSQL (Neon)**. Designed to support multi-tenant hospital operations with modular architecture and enterprise-level data handling.

---

## Contributors

| Name | Role | Responsibilities |
|------|------|-----------------|
| **Aditya Singh** | Backend Lead | System architecture, Express app setup, server configuration, JWT authentication, middleware (auth, RBAC, validation, error handling), hospital & doctor modules, deployment on Render, API testing with Postman |
| **Priyanshi Mishra** | Backend Developer | Prisma schema design, database configuration, ambulance, beds, IPD, lab, medicines, prescriptions, invoices, payouts, notifications modules, API testing with Postman |

---

## System Overview

MedInfera follows a **modular architecture** where each healthcare domain is implemented as an independent module. The system is built as a **multi-tenant SaaS platform** where each hospital operates in isolation using a shared infrastructure — all data is separated at the hospital level using unique identifiers.

---

## Core Features

### Authentication and Authorization
JWT-based auth with access and refresh tokens. Role-based access control (RBAC) for admins, doctors, and staff. Passwords are bcrypt-hashed and all protected routes are enforced through middleware.

### Multi-Tenant Architecture
Multiple hospitals share the same infrastructure with logical data isolation per hospital, making the system SaaS-ready from the ground up.

### User and Role Management
Multiple user roles with profile management, activity tracking, and access control enforced across all modules.

### Hospital and Doctor Management
Hospital registration, configuration, and operational setup. Doctor profiles include specialization, availability, schedules, and leave tracking.

### Patient Management
Complete patient records with personal details, medical history, and emergency contact information. Designed for long-term patient lifecycle tracking.

### Appointment System
Booking, scheduling, token management, and follow-up tracking. Full appointment lifecycle — creation, updates, and status transitions.

### IPD (In-Patient Department)
Patient admissions, bed allocation, ward transfers, and discharge processing. Tracks attending doctors and patient status throughout hospitalization.

### Bed and Ward Management
Hospital infrastructure management — wards, bed availability, allocation, and transfers across departments.

### Pharmacy System
Medicine inventory, batch tracking, stock control, and prescription handling with dispensing workflows.

### Lab Management
Lab test definitions, panels, and orders. Tracks sample collection, processing, and result reporting.

### Billing and Invoicing
Invoice generation, payment tracking, and structured billing workflows for hospital operations.

### Background Jobs and Scheduling
Cron-based background processing for automated tasks and system maintenance.

### Notifications
System-level notification handling across modules.

### Audit Logging
Action logs across all modules for traceability and monitoring.

### Security and Performance
Helmet for HTTP security headers, rate limiting, input validation via Joi, and structured request logging.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL (Neon) |
| Authentication | JWT (Access + Refresh Tokens) |
| Realtime | Socket.io |
| Validation | Joi |
| Logging | Winston |
| Security | Helmet, Rate Limiting |
| Testing | Postman |
| Deployment | Render |

---

## Project Structure

```
medinfera-backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── index.js
│   │   ├── logger.js
│   │   └── socket.js
│   ├── jobs/
│   │   └── scheduler.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── rbac.js
│   │   ├── requestLogger.js
│   │   └── validate.js
│   ├── modules/
│   │   ├── ambulance/
│   │   ├── appointments/
│   │   ├── auth/
│   │   ├── beds/
│   │   ├── doctors/
│   │   ├── hospitals/
│   │   ├── invoices/
│   │   ├── ipd/
│   │   ├── lab/
│   │   ├── medicines/
│   │   ├── notifications/
│   │   ├── patients/
│   │   ├── payouts/
│   │   ├── prescriptions/
│   │   └── users/
│   ├── utils/
│   │   ├── AppError.js
│   │   ├── asyncHandler.js
│   │   ├── auditLogger.js
│   │   ├── codeGenerator.js
│   │   ├── pagination.js
│   │   ├── response.js
│   │   └── tokenService.js
│   ├── app.js
│   └── server.js
├── .env.example
├── package.json
└── render.yaml
```

---

## API Base URL

```
https://medinfera-backend.onrender.com/api/v1
```

All endpoints are prefixed with this base path. Protected routes require a valid **JWT Bearer token** in the `Authorization` header.

---

## API Response Format

All responses follow a consistent structure:

**Success**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

**Error**
```json
{
  "success": false,
  "message": "Error description",
  "error": {}
}
```

---

## Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/MedInfera/medinfera-backend.git
cd medinfera-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Fill in your values in .env
```

### 4. Run Prisma migrations
```bash
npx prisma migrate deploy
```

### 5. Start the server
```bash
node src/server.js
```

Server runs on `http://localhost:5000`

---

## Environment Variables

See `.env.example` for all required variables including:

- `DATABASE_URL` — Neon PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — Auth secrets
- `PORT`, `NODE_ENV`, `CORS_ORIGINS`, `SOCKET_CORS_ORIGINS`

---

## Deployment

The backend is deployed on **Render** with auto-build from the `main` branch. The `render.yaml` in the root defines the service configuration. Prisma migrations run automatically on each deployment.

---

## Future Scope

- Swagger/OpenAPI documentation
- Advanced permission management
- Caching and performance optimization
- Microservices architecture for scaling

---

## Summary

MedInfera Backend is a robust, modular, and production-ready system for real-world healthcare SaaS applications. Built with clean separation of concerns, structured validation, standardized error handling, and enterprise-level security — it provides a strong foundation for scalable hospital management platforms.