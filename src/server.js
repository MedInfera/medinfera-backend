require('dotenv').config();
const http = require('http');
const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const { initSocket } = require('./config/socket');
const { initJobs } = require('./jobs/scheduler');
const prisma = require('./config/database');

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

const startServer = async () => {
  try {
    // Test DB connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Seed SUPER_ADMIN if not exists
    await seedSuperAdmin();

    // Start background jobs
    if (config.env !== 'test') {
      initJobs();
    }

    server.listen(config.port, () => {
      logger.info(`MedInfera API running on port ${config.port} [${config.env}]`);
      logger.info(`API Base: http://localhost:${config.port}/api/${config.apiVersion}`);
      logger.info(`Health:   http://localhost:${config.port}/health`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

const seedSuperAdmin = async () => {
  const bcrypt = require('bcryptjs');
  const existing = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN', deletedAt: null },
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash(config.superAdmin.password, config.bcrypt.rounds);
    await prisma.user.create({
      data: {
        email: config.superAdmin.email,
        passwordHash,
        role: 'SUPER_ADMIN',
        firstName: config.superAdmin.firstName,
        lastName: config.superAdmin.lastName,
        isEmailVerified: true,
        mustResetPassword: false,
        hospitalId: null,
      },
    });
    logger.info(`SUPER_ADMIN seeded: ${config.superAdmin.email}`);
  }
};

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

startServer();
