import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { ttsService } from '../services/tts.service';

const router = Router();

// GET /api/dashscope/config — Return WebSocket URL and model config for frontend
router.get('/config', authenticate, async (_req: Request, res: Response) => {
  const wsUrl = process.env.DASHSCOPE_WS_URL || 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/';
  const sttModel = process.env.DASHSCOPE_STT_MODEL || 'paraformer-realtime-v2';
  const languageHints = process.env.DASHSCOPE_LANGUAGE_HINTS?.split(',') || ['zh', 'en'];

  const proxyUrl = `/api/dashscope/stt-proxy`;

  res.json({
    code: 0,
    message: 'success',
    data: { wsUrl: proxyUrl, sttModel, languageHints },
  });
});

// GET /api/dashscope/tts-config — Return TTS model/voice/format config
router.get('/tts-config', authenticate, async (_req: Request, res: Response) => {
  const config = ttsService.getConfig();
  res.json({
    code: 0,
    message: 'success',
    data: config,
  });
});

export default router;