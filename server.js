// Entry point — creates HTTP server, attaches Socket.io, starts listening
const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/config/socket');
const env = require('./src/config/env');
const { pool } = require('./src/config/db');

const server = http.createServer(app);
initSocket(server);

server.listen(env.port, () => {
  console.log(`\n🚀 MedInfera running on port ${env.port}`);
  console.log(`🌐 Health: http://localhost:${env.port}/health\n`);
});

process.on('SIGTERM', async () => {
  await pool.end();
  server.close(() => process.exit(0));
});