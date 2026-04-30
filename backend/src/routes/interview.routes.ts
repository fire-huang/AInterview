import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createInterview,
  getInterview,
  recoverInterview,
  finishInterview,
  deleteInterview
} from '../controllers/interview.controller';

const router = Router();

/**
 * @route POST /api/interviews
 * @desc 创建面试会话
 * @access Private
 */
router.post('/', authenticate, createInterview);

/**
 * @route GET /api/interviews/:id
 * @desc 获取面试会话详情
 * @access Private
 */
router.get('/:id', authenticate, getInterview);

/**
 * @route POST /api/interviews/:id/recover
 * @desc 恢复面试会话
 * @access Private
 */
router.post('/:id/recover', authenticate, recoverInterview);

/**
 * @route POST /api/interviews/:id/finish
 * @desc 结束面试
 * @access Private
 */
router.post('/:id/finish', authenticate, finishInterview);

/**
 * @route DELETE /api/interviews/:id
 * @desc 删除面试会话及所有关联数据
 * @access Private
 */
router.delete('/:id', authenticate, deleteInterview);

export default router;
