import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getSettings, updateSettings } from '../controllers/settings.controller';

const router = Router();

router.get('/me/settings', authenticate, getSettings);
router.patch('/me/settings', authenticate, updateSettings);

export default router;
