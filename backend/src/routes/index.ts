import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import resumeRoutes from './resume.routes';
import interviewRoutes from './interview.routes';
import reportRoutes from './report.routes';
import trainingRoutes from './training.routes';
import eventRoutes from './event.routes';
import healthRoutes from './health.routes';
import historyRoutes from './history.routes';
import questionRoutes from './question.routes';
import settingsRoutes from './settings.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/users', settingsRoutes);
router.use('/resumes', resumeRoutes);
router.use('/interviews', interviewRoutes);
router.use('/reports', reportRoutes);
router.use('/training-tasks', trainingRoutes);
router.use('/events', eventRoutes);
router.use('/health', healthRoutes);
router.use('/interviews', questionRoutes);
router.use('/', historyRoutes);

export default router;
