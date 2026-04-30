import { Router } from 'express';

const router = Router();

/**
 * @route GET /api/health
 * @desc 健康检查
 * @access Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    code: 0,
    message: 'ok',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
