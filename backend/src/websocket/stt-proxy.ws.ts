import WebSocket from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.util';

const JWT_SECRET = process.env.JWT_SECRET || 'ainterview-secret-key';
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || '';
const DASHSCOPE_WS_URL = process.env.DASHSCOPE_WS_URL || 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/';
const STT_PROXY_PATH = '/api/dashscope/stt-proxy';

/**
 * Create a WebSocket.Server that handles STT proxy upgrades.
 * Uses verifyClient to only accept connections on the STT proxy path,
 * so Socket.IO can handle its own upgrades without conflict.
 */
export function createSttProxyServer(server: http.Server): void {
  const wss = new WebSocket.Server({
    noServer: true,
    verifyClient: (info, done) => {
      // Only accept upgrades on our specific path
      if (!info.req.url?.startsWith(STT_PROXY_PATH)) {
        done(false, 404, 'Not Found');
        return;
      }

      // Authenticate: extract JWT from URL query param
      const url = new URL(info.req.url!, `http://${info.req.headers.host || 'localhost'}`);
      const token = url.searchParams.get('token');

      if (!token) {
        done(false, 401, 'No token provided');
        return;
      }

      try {
        jwt.verify(token, JWT_SECRET);
        done(true);
      } catch {
        done(false, 401, 'Invalid token');
      }
    },
  });

  // Intercept upgrade events before Socket.IO processes them
  server.on('upgrade', (request, socket, head) => {
    logger.info('[STT Proxy] Upgrade request:', request.url);
    const pathname = request.url ? new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname : '';

    if (pathname === STT_PROXY_PATH) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
        proxyConnection(ws);
      });
      // Don't call next() — this upgrade is ours
      return;
    }
    // For all other paths, Socket.IO will handle the upgrade
  });
}

function isTextMessage(data: WebSocket.Data): boolean {
  if (typeof data === 'string') return true;
  if (Buffer.isBuffer(data)) {
    // Text JSON messages start with '{'
    return data[0] === 0x7B; // '{'
  }
  return false;
}

function proxyConnection(clientWs: WebSocket): void {
  // Buffer messages until DashScope WS is open
  const messageBuffer: WebSocket.Data[] = [];

  // Connect to DashScope with Authorization header
  const dashscopeWs = new WebSocket(DASHSCOPE_WS_URL, {
    headers: {
      Authorization: `bearer ${DASHSCOPE_API_KEY}`,
    },
  });

  dashscopeWs.on('open', () => {
    // Flush buffered messages (text as text, binary as binary)
    for (const msg of messageBuffer) {
      if (isTextMessage(msg)) {
        dashscopeWs.send(msg.toString(), { binary: false });
      } else {
        dashscopeWs.send(msg, { binary: true });
      }
    }
    messageBuffer.length = 0;
  });

  // Forward client → DashScope (text as text frames, binary as binary frames)
  clientWs.on('message', (data: WebSocket.Data) => {
    const isText = isTextMessage(data);
    if (dashscopeWs.readyState === WebSocket.OPEN) {
      if (isText) {
        dashscopeWs.send(data.toString(), { binary: false });
      } else {
        dashscopeWs.send(data, { binary: true });
      }
    } else if (dashscopeWs.readyState === WebSocket.CONNECTING) {
      messageBuffer.push(data);
    }
  });

  // Forward DashScope → client (text as text frames, binary as binary frames)
  dashscopeWs.on('message', (data: WebSocket.Data) => {
    const isText = isTextMessage(data);
    if (clientWs.readyState === WebSocket.OPEN) {
      if (isText) {
        clientWs.send(data.toString(), { binary: false });
      } else {
        clientWs.send(data, { binary: true });
      }
    }
  });

  // Close cascading
  clientWs.on('close', () => {
    dashscopeWs.close();
  });

  dashscopeWs.on('close', () => {
    clientWs.close();
  });

  dashscopeWs.on('error', (err) => {
    logger.error('[STT Proxy] DashScope connection error:', err.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        header: { event: 'task-failed', error_message: 'DashScope connection failed: ' + err.message },
        payload: {},
      }));
      clientWs.close();
    }
  });

  clientWs.on('error', (err) => {
    logger.error('[STT Proxy] Client connection error:', err.message);
    dashscopeWs.close();
  });
}