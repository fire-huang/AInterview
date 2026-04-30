import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ainterview-secret-key';

interface SocketAuthData {
  id: string;
  email: string;
}

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SocketAuthData;
    socket.data.user = decoded;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}