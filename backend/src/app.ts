import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import resumeRoutes from './routes/resume.routes';
import interviewRoutes from './routes/interview.routes';
import reportRoutes from './routes/report.routes';
import trainingRoutes from './routes/training.routes';
import eventRoutes from './routes/event.routes';
import healthRoutes from './routes/health.routes';
import questionRoutes from './routes/question.routes';
import historyRoutes from './routes/history.routes';
import azureRoutes from './routes/azure.routes';
import dashscopeRoutes from './routes/dashscope.routes';
import videoRoutes from './routes/video.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';

// Import WebSocket setup
import { setupWebSocket } from './websocket/interview.ws';
import { createSttProxyServer } from './websocket/stt-proxy.ws';
import { logger } from './utils/logger.util';

const app: Application = express();
const port = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true,
};
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/interviews', historyRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/interviews', questionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/training-tasks', trainingRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/azure', azureRoutes);
app.use('/api/dashscope', dashscopeRoutes);
app.use('/api/interviews', videoRoutes);

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    code: 404,
    message: 'Route not found',
  });
});

// Error handler
app.use(errorHandler);

// Start server
const server = createServer(app);

// STT WebSocket proxy: MUST register before Socket.IO so our upgrade handler runs first
createSttProxyServer(server);

// Socket.IO setup
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupWebSocket(io);

server.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
  logger.info('Socket.IO is ready');
});

export { app, io };