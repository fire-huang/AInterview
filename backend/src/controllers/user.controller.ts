import { Request, Response } from 'express';
import prisma from '../utils/prisma.util';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * @desc 获取当前用户信息
 */
export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      role: true,
      createdAt: true,
      interviews: {
        where: { status: 'completed' },
        select: { id: true, report: { select: { totalScore: true } } }
      }
    }
  });

  if (!user) {
    return res.status(404).json({
      code: 404,
      message: 'User not found',
    });
  }

  // Calculate stats
  const mocksCount = user.interviews.length;
  const avgScore = mocksCount > 0
    ? user.interviews.reduce((sum, interview: any) => sum + (interview.report?.totalScore || 0), 0) / mocksCount
    : 0;

  res.status(200).json({
    code: 0,
    message: 'ok',
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      stats: {
        mocksCount,
        avgScore: parseFloat(avgScore.toFixed(2))
      }
    }
  });
});

/**
 * @desc 更新当前用户信息
 */
export const updateMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { name, avatar, role } = req.body;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      avatar,
      role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      role: true,
    }
  });

  res.status(200).json({
    code: 0,
    message: 'ok',
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
    }
  });
});
