import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getTrainingTasks, completeTask } from '../controllers/training.controller';

const router = Router();

/**
 * @route GET /api/training-tasks
 * @desc 获取训练任务列表
 * @access Private
 */
router.get('/', authenticate, getTrainingTasks);

/**
 * @route POST /api/training-tasks/:id/complete
 * @desc 完成训练任务
 * @access Private
 */
router.post('/:id/complete', authenticate, completeTask);

export default router;
