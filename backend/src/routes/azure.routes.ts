import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

function getAzureTokenEndpoint(region: string): string {
  const endpoint = process.env.AZURE_SPEECH_ENDPOINT || `https://${region}.api.cognitive.microsoft.com`;
  // 世纪互联 uses .azure.cn domain
  if (endpoint.includes('.azure.cn')) {
    return `https://${region}.api.cognitive.azure.cn/sts/v1.0/issueToken`;
  }
  return `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
}

// GET /api/azure/speech-token — Generate short-lived Azure STT auth token
router.get('/speech-token', authenticate, async (req: Request, res: Response) => {
  try {
    const region = process.env.AZURE_SPEECH_REGION || 'eastasia';
    const speechKey = process.env.AZURE_SPEECH_KEY;

    if (!speechKey) {
      return res.status(500).json({ code: 500, message: 'Azure Speech key not configured' });
    }

    const tokenUrl = getAzureTokenEndpoint(region);

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': speechKey,
        'Content-Length': '0',
      },
    });

    if (!tokenResponse.ok) {
      return res.status(500).json({ code: 500, message: 'Failed to get Azure speech token' });
    }

    const token = await tokenResponse.text();

    res.json({
      token,
      region,
      endpoint: process.env.AZURE_SPEECH_ENDPOINT || `https://${region}.api.cognitive.microsoft.com`,
      expiresIn: 600,
    });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message || 'Token generation failed' });
  }
});

// GET /api/azure/speech-config — Return Azure Speech endpoint config for frontend STT
router.get('/speech-config', authenticate, async (_req: Request, res: Response) => {
  const region = process.env.AZURE_SPEECH_REGION || 'eastasia';
  const endpoint = process.env.AZURE_SPEECH_ENDPOINT || `https://${region}.api.cognitive.microsoft.com`;
  const language = process.env.AZURE_SPEECH_LANGUAGE || 'zh-CN';

  res.json({
    region,
    endpoint,
    language,
  });
});

export default router;