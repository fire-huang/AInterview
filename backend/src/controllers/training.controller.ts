import { Request, Response } from 'express';
import prisma from '../utils/prisma.util';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * @desc 获取训练任务列表
 */
export const getTrainingTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { status, limit = 20, offset = 0 } = req.query;

  const where: any = { userId };
  if (status) {
    where.status = status;
  }

  const [tasks, total] = await Promise.all([
    prisma.trainingTask.findMany({
      where,
      skip: parseInt(offset as string),
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        weakTag: true,
        status: true,
        createdAt: true,
      }
    }),
    prisma.trainingTask.count({ where })
  ]);

  res.status(200).json({
    code: 0,
    message: 'ok',
    data: {
      tasks,
      total,
    }
  });
});

/**
 * @desc 完成训练任务
 */
export const completeTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const task = await prisma.trainingTask.findFirst({
    where: { id, userId }
  });

  if (!task) {
    return res.status(404).json({
      code: 404,
      message: 'Training task not found',
    });
  }

  await prisma.trainingTask.update({
    where: { id },
    data: {
      status: 'done',
      completedAt: new Date(),
    }
  });

  res.status(200).json({
    code: 0,
    message: 'ok',
    data: {},
  });
});
