import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getReport, regenerateReport } from '../controllers/report.controller';

const router = Router();

/**
 * @route GET /api/interviews/:sessionId/report
 * @desc 获取面试报告
 * @access Private
 */
router.get('/:sessionId/report', authenticate, getReport);

/**
 * @route POST /api/interviews/:sessionId/report/regenerate
 * @desc 重新生成报告
 * @access Private
 */
router.post('/:sessionId/report/regenerate', authenticate, regenerateReport);

export default router;
