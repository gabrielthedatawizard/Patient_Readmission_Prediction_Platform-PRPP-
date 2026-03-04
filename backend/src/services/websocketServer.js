const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'trip-dev-secret-change-in-production';

class TripWebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clientsByUserId = new Map();
    this.connectionMeta = new WeakMap();

    this.wss.on('connection', (socket, request) => {
      this.handleConnection(socket, request);
    });
  }

  handleConnection(socket, request) {
    const requestUrl = new URL(request.url, 'ws://localhost');
    const token = requestUrl.searchParams.get('token');

    if (!token) {
      socket.close(1008, 'Missing token');
      return;
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET, { issuer: 'trip-backend' });
    } catch (error) {
      socket.close(1008, 'Unauthorized');
      return;
    }

    const userId = payload.sub;
    if (!userId) {
      socket.close(1008, 'Unauthorized');
      return;
    }

    if (!this.clientsByUserId.has(userId)) {
      this.clientsByUserId.set(userId, new Set());
    }
    this.clientsByUserId.get(userId).add(socket);
    this.connectionMeta.set(socket, {
      userId,
      facilityId: payload.facilityId || null,
      role: payload.role || null
    });

    socket.on('close', () => {
      this.unregisterSocket(userId, socket);
    });

    socket.on('error', () => {
      this.unregisterSocket(userId, socket);
    });

    socket.on('message', (rawMessage) => {
      this.handleMessage(socket, rawMessage);
    });

    this.sendToSocket(socket, 'connected', {
      userId,
      connectedAt: new Date().toISOString()
    });
  }

  unregisterSocket(userId, socket) {
    const sockets = this.clientsByUserId.get(userId);
    if (!sockets) {
      return;
    }

    sockets.delete(socket);
    if (sockets.size === 0) {
      this.clientsByUserId.delete(userId);
    }
    this.connectionMeta.delete(socket);
  }

  handleMessage(socket, rawMessage) {
    try {
      const parsed = JSON.parse(String(rawMessage || '{}'));
      if (parsed?.type === 'ping') {
        this.sendToSocket(socket, 'pong', { timestamp: new Date().toISOString() });
      }
    } catch (error) {
      this.sendToSocket(socket, 'error', {
        message: 'Invalid WebSocket payload.'
      });
    }
  }

  sendToSocket(socket, type, payload) {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(
      JSON.stringify({
        type,
        payload
      })
    );
  }

  broadcast(userIds, type, payload) {
    userIds.forEach((userId) => {
      const sockets = this.clientsByUserId.get(userId);
      if (!sockets) {
        return;
      }

      sockets.forEach((socket) => this.sendToSocket(socket, type, payload));
    });
  }

  broadcastToFacility(facilityId, type, payload) {
    this.wss.clients.forEach((socket) => {
      if (socket.readyState !== WebSocket.OPEN) {
        return;
      }

      const meta = this.connectionMeta.get(socket);
      if (!meta) {
        return;
      }

      if (facilityId && meta.facilityId && meta.facilityId !== facilityId) {
        return;
      }

      this.sendToSocket(socket, type, payload);
    });
  }
}

module.exports = TripWebSocketServer;

