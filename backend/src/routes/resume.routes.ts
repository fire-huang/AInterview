import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { uploadResume, getUserResumes, deleteResume, parseResume, getResumeFile } from '../controllers/resume.controller';
import upload from '../middleware/upload.middleware';

const router = Router();

/**
 * @route POST /api/resumes
 * @desc 上传简历
 * @access Private
 */
router.post('/', authenticate, upload.single('file'), uploadResume);

/**
 * @route GET /api/resumes/me
 * @desc 获取用户简历列表
 * @access Private
 */
router.get('/me', authenticate, getUserResumes);

/**
 * @route DELETE /api/resumes/:id
 * @desc 删除简历
 * @access Private
 */
router.delete('/:id', authenticate, deleteResume);

/**
 * @route POST /api/resumes/:id/parse
 * @desc 手动重新解析简历
 * @access Private
 */
router.post('/:id/parse', authenticate, parseResume);

/**
 * @route GET /api/resumes/:id/file
 * @desc 获取简历原始文件（PDF 返回文件流，DOCX 返回文本）
 * @access Private
 */
router.get('/:id/file', getResumeFile);

export default router;
