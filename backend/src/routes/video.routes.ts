import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../utils/prisma.util';

const UPLOAD_DIR = process.env.VIDEO_UPLOAD_DIR || './uploads/videos';

// Ensure video upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max for video
  fileFilter: (_req, file, cb) => {
    const allowed = ['.webm', '.mp4', '.mov', '.mkv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

const router = Router();

// POST /api/interviews/:sessionId/video-upload — Upload interview video recording
router.post(
  '/:sessionId/video-upload',
  authenticate,
  videoUpload.single('video'),
  async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const user = (req as any).user;

    try {
      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
      });

      if (!session || session.userId !== user.id) {
        return res.status(403).json({ code: 403, message: 'Unauthorized' });
      }

      if (!req.file) {
        return res.status(400).json({ code: 400, message: 'No video file provided' });
      }

      const videoUrl = `/uploads/videos/${req.file.filename}`;

      await prisma.interviewSession.update({
        where: { id: sessionId },
        data: { videoUrl },
      });

      res.json({
        videoUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (err: any) {
      res.status(500).json({ code: 500, message: err.message || 'Video upload failed' });
    }
  },
);

// GET /api/interviews/:sessionId/video — Get video URL for playback
router.get(
  '/:sessionId/video',
  authenticate,
  async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const user = (req as any).user;

    try {
      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
      });

      if (!session || session.userId !== user.id) {
        return res.status(403).json({ code: 403, message: 'Unauthorized' });
      }

      if (!session.videoUrl) {
        return res.status(404).json({ code: 404, message: 'No video recording available' });
      }

      res.json({ videoUrl: session.videoUrl });
    } catch (err: any) {
      res.status(500).json({ code: 500, message: err.message || 'Failed to get video' });
    }
  },
);

export default router;