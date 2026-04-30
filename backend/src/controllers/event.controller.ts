import { Request, Response } from 'express';
import prisma from '../utils/prisma.util';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * @desc 上报埋点事件
 */
export const trackEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventName, sessionId, eventData } = req.body;

  if (!eventName) {
    return res.status(400).json({
      code: 400,
      message: 'Event name is required',
    });
  }

  await prisma.eventLog.create({
    data: {
      userId: req.user?.id,
      sessionId,
      eventName,
      eventData: JSON.stringify(eventData || {}),
    }
  });

  res.status(200).json({
    code: 0,
    message: 'ok',
    data: {},
  });
});
