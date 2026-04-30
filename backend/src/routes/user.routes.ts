import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getMe, updateMe } from '../controllers/user.controller';
import { getUserResumes } from '../controllers/resume.controller';

const router = Router();

/**
 * @route GET /api/users/me
 * @desc 获取当前用户信息
 * @access Private
 */
router.get('/me', authenticate, getMe);

/**
 * @route PATCH /api/users/me
 * @desc 更新当前用户信息
 * @access Private
 */
router.patch('/me', authenticate, updateMe);

/**
 * @route GET /api/users/me/resumes
 * @desc 获取用户简历列表
 * @access Private
 */
router.get('/me/resumes', authenticate, getUserResumes);

export default router;
