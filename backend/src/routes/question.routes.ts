import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getCurrentQuestion,
  submitAnswer,
  triggerFollowup,
  nextStage
} from '../controllers/question.controller';

const router = Router();

/**
 * @route GET /api/interviews/:sessionId/questions/current
 * @desc 获取当前问题
 * @access Private
 */
router.get('/:sessionId/questions/current', authenticate, getCurrentQuestion);

/**
 * @route POST /api/interviews/:sessionId/answers
 * @desc 提交回答
 * @access Private
 */
router.post('/:sessionId/answers', authenticate, submitAnswer);

/**
 * @route POST /api/interviews/:sessionId/followups
 * @desc 触发追问
 * @access Private
 */
router.post('/:sessionId/followups', authenticate, triggerFollowup);

/**
 * @route POST /api/interviews/:sessionId/next-stage
 * @desc 推进到下一阶段
 * @access Private
 */
router.post('/:sessionId/next-stage', authenticate, nextStage);

export default router;
