// Socket.io — real-time updates for bed status and ambulance trips
const { Server } = require('socket.io');
const env = require('./env');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.frontendUrl,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Each hospital gets its own room so updates dont leak between hospitals
    socket.on('join:hospital', (hospitalId) => {
      socket.join(`hospital:${hospitalId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

// Use this anywhere in the app to emit real-time events
const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

module.exports = { initSocket, getIO };