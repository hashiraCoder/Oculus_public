/**
 * notifications/websocket.gateway.js
 *
 * Socket.IO server with:
 *   • In-memory adapter (single-instance deployment)
 *   • JWT authentication middleware
 *   • Workspace room management
 *
 * Events are emitted directly via getIO() from SocketPublisher.
 */

import { Server } from 'socket.io';
import config from '../config/env.js';
import logger from '../config/logger.js';
import { socketAuthMiddleware, requireWorkspaceAccess } from './socket-auth.js';

let io;

export const initializeWebSocket = (httpServer) => {
  const corsOrigin = config.cors?.origin;
  if (!corsOrigin) {
    logger.warn('[WebSocket] CORS_URL not set — accepting connections from any origin. Set CORS_URL in production.');
  }

  // ── Socket.IO server ───────────────────────────────────────────────────────
  io = new Server(httpServer, {
    cors: {
      origin:      corsOrigin || '*',
      credentials: true,
    },
    pingInterval: config.websocket.pingInterval,
    pingTimeout:  config.websocket.pingTimeout,
  });

  // ── Auth middleware ────────────────────────────────────────────────────────
  io.use(socketAuthMiddleware);

  // ── Connection handler ────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    logger.info(`[WebSocket] Client connected: ${socket.id} (User: ${socket.user?.sub})`);

    socket.on('join_workspace', async (workspaceId) => {
      try {
        await requireWorkspaceAccess(socket, workspaceId);
        const roomName = `workspace:${workspaceId}`;
        socket.join(roomName);
        logger.debug(`[WebSocket] Socket ${socket.id} joined room ${roomName}`);
        socket.emit('joined_room', { room: roomName });
      } catch (error) {
        logger.warn(`[WebSocket] Socket ${socket.id} rejected from workspace ${workspaceId}: ${error.message}`);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('disconnect', (reason) => {
      logger.debug(`[WebSocket] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  logger.info('[WebSocket] ✓ Initialized (In-Memory Adapter)');
};

export const getIO = () => {
  if (!io) {
    throw new Error('[WebSocket] Socket.IO not initialized — call initializeWebSocket() first');
  }
  return io;
};
