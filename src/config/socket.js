const { Server } = require('socket.io');
const config = require('./index');
const logger = require('./logger');
const { verifyAccessToken } = require('../utils/tokenService');

let io;

const ROOMS = {
  hospital: (hospitalId) => `hospital:${hospitalId}`,
  user: (userId) => `user:${userId}`,
  ambulance: (ambulanceId) => `ambulance:${ambulanceId}`,
};

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.socket.corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Auth middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) return next(new Error('Authentication required'));

      const decoded = verifyAccessToken(token);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, hospitalId, role } = socket.user;
    logger.info(`Socket connected: userId=${userId} role=${role}`);

    // Auto-join user & hospital rooms
    socket.join(ROOMS.user(userId));
    if (hospitalId) socket.join(ROOMS.hospital(hospitalId));

    // Ambulance driver location update
    socket.on('ambulance:location', async (data) => {
      const { ambulanceId, latitude, longitude, speed } = data;
      // Broadcast to hospital room
      socket.to(ROOMS.hospital(hospitalId)).emit('ambulance:location_update', {
        ambulanceId,
        latitude,
        longitude,
        speed,
        timestamp: new Date(),
      });
    });

    // Join ambulance tracking room
    socket.on('ambulance:track', ({ ambulanceId }) => {
      socket.join(ROOMS.ambulance(ambulanceId));
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: userId=${userId}`);
    });
  });

  logger.info('Socket.io initialized');
  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

// Emit to a specific user
const emitToUser = (userId, event, data) => {
  if (io) io.to(ROOMS.user(userId)).emit(event, data);
};

// Emit to all users in a hospital
const emitToHospital = (hospitalId, event, data) => {
  if (io) io.to(ROOMS.hospital(hospitalId)).emit(event, data);
};

module.exports = { initSocket, getIO, emitToUser, emitToHospital, ROOMS };
