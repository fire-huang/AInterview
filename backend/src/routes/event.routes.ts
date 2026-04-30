import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.middleware';
import { trackEvent } from '../controllers/event.controller';

const router = Router();

/**
 * @route POST /api/events/track
 * @desc 上报埋点事件
 * @access Public (optional auth)
 */
router.post('/track', optionalAuth, trackEvent);

export default router;
