// Express application setup
// All middleware and route modules are registered here
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());

app.use(cors({
  origin: env.frontendUrl,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Health check — Railway pings this to confirm the server is alive
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'MedInfera', version: '1.0.0' });
});

// ── Routes ──
app.use('/api/auth', require('./modules/auth/routes'));

// 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler — must be last
app.use(errorHandler);

module.exports = app;