import { Request, Response } from 'express';
import prisma from '../utils/prisma.util';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * @desc 获取面试历史列表
 */
export const getInterviewHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const {
    role,
    interviewType,
    status,
    startDate,
    endDate,
    limit = '20',
    offset = '0'
  } = req.query;

  const where: any = { userId };

  if (role) where.position = role as string;
  if (interviewType) where.interviewType = interviewType as string;
  if (status) where.status = status as string;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate as string);
    if (endDate) where.createdAt.lte = new Date(endDate as string);
  }

  const [records, total] = await Promise.all([
    prisma.interviewSession.findMany({
      where,
      skip: parseInt(offset as string),
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        position: true,
        interviewType: true,
        status: true,
        createdAt: true,
        report: {
          select: {
            totalScore: true,
            weakTags: true,
          }
        }
      }
    }),
    prisma.interviewSession.count({ where })
  ]);

  res.status(200).json({
    code: 0,
    message: 'ok',
    data: {
      records: records.map(record => ({
        sessionId: record.id,
        role: record.position,
        interviewType: record.interviewType,
        status: record.status,
        totalScore: record.report?.totalScore,
        weakTags: record.report?.weakTags || [],
        finishedAt: record.createdAt
      })),
      total,
    }
  });
});
