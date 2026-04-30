import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { getInterviewHistory } from '../controllers/history.controller';

const router = Router();

/**
 * @route GET /api/interviews/history
 * @desc 获取面试历史列表
 * @access Private
 */
router.get('/history', authenticate, getInterviewHistory);

export default router;
