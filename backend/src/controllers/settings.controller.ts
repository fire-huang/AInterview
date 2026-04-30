import { Response } from 'express';
import prisma from '../utils/prisma.util';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export const getSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  let settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { userId },
    });
  }

  res.status(200).json({
    code: 0,
    message: 'ok',
    data: settings,
  });
});

export const updateSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const allowed = ['aiPersonality', 'aiSpeed', 'feedbackLevel', 'language', 'darkMode', 'notifications', 'autoSave', 'defaultRole'];
  const data: Record<string, any> = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      data[key] = req.body[key];
    }
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });

  res.status(200).json({
    code: 0,
    message: 'ok',
    data: settings,
  });
});
