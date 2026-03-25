const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes          = require('./modules/auth/auth.routes');
const hospitalRoutes      = require('./modules/hospitals/hospitals.routes');
const userRoutes          = require('./modules/users/users.routes');
const doctorRoutes        = require('./modules/doctors/doctors.routes');
const patientRoutes       = require('./modules/patients/patients.routes');
const appointmentRoutes   = require('./modules/appointments/appointments.routes');
const bedRoutes           = require('./modules/beds/beds.routes');
const ipdRoutes           = require('./modules/ipd/ipd.routes');
const medicineRoutes      = require('./modules/medicines/medicines.routes');
const prescriptionRoutes  = require('./modules/prescriptions/prescriptions.routes');
const labRoutes           = require('./modules/lab/lab.routes');
const invoiceRoutes       = require('./modules/invoices/invoices.routes');
const ambulanceRoutes     = require('./modules/ambulance/ambulance.routes');
const payoutRoutes        = require('./modules/payouts/payouts.routes');
const notificationRoutes  = require('./modules/notifications/notifications.routes');

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());

// ✅ FIXED CORS (simple & safe for your project)
app.use(cors({
  origin: '*',
  credentials: true,
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts' },
});

app.use(limiter);

// ─── General Middleware ───────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Trust proxy (important for Render)
app.set('trust proxy', 1);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'MedInfera API is running',
    version: config.apiVersion,
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
const API = `/api/${config.apiVersion}`;

app.use(`${API}/auth`,          authLimiter, authRoutes);
app.use(`${API}/hospitals`,     hospitalRoutes);
app.use(`${API}/users`,         userRoutes);
app.use(`${API}/doctors`,       doctorRoutes);
app.use(`${API}/patients`,      patientRoutes);
app.use(`${API}/appointments`,  appointmentRoutes);
app.use(`${API}/beds`,          bedRoutes);
app.use(`${API}/ipd`,           ipdRoutes);
app.use(`${API}/medicines`,     medicineRoutes);
app.use(`${API}/prescriptions`, prescriptionRoutes);
app.use(`${API}/lab`,           labRoutes);
app.use(`${API}/invoices`,      invoiceRoutes);
app.use(`${API}/ambulance`,     ambulanceRoutes);
app.use(`${API}/payouts`,       payoutRoutes);
app.use(`${API}/notifications`, notificationRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;