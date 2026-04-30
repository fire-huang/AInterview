import { Request, Response } from 'express';
import prisma from '../utils/prisma.util';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { aiService } from '../services/ai.service';

/**
 * @desc 创建面试会话
 */
export const createInterview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { resumeId, position, company, interviewType, difficulty, focusAreas, additionalInfo, mode } = req.body;
  const userId = req.user!.id;

  // Check if resume exists (if provided)
  let resumeContent: string | undefined;
  if (resumeId) {
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId }
    });

    if (!resume) {
      return res.status(404).json({
        code: 404,
        message: 'Resume not found',
      });
    }
    resumeContent = resume.content ?? undefined;
  }

  // Create interview session and start it immediately
  const session = await prisma.interviewSession.create({
    data: {
      userId,
      resumeId,
      position,
      company,
      interviewType,
      difficulty,
      focusAreas: focusAreas || [],
      mode: mode || 'text',
      status: 'in_progress',
      currentStage: 'intro',
      startTime: new Date(),
    }
  });

  // Generate first question via AI
  const ctx = {
    position,
    company,
    interviewType,
    difficulty,
    focusAreas: focusAreas || [],
    currentStage: 'intro' as string,
    resumeContent,
  };
  const firstQuestion = await aiService.generateQuestion(ctx);

  // Save first question as AI message
  await prisma.interviewMessage.create({
    data: {
      sessionId: session.id,
      role: 'ai',
      content: firstQuestion.content,
      questionId: firstQuestion.questionId,
    }
  });

  res.status(201).json({
    code: 0,
    message: 'ok',
    data: {
      session: {
        id: session.id,
        status: session.status,
        currentStage: session.currentStage,
        position: session.position,
        company: session.company,
        interviewType: session.interviewType,
        difficulty: session.difficulty,
        focusAreas: session.focusAreas,
        mode: session.mode,
        startTime: session.startTime,
        createdAt: session.createdAt,
        estimatedDuration: '45 minutes',
      }
    }
  });
});

/**
 * @desc 获取面试会话详情
 */
export const getInterview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const session = await prisma.interviewSession.findFirst({
    where: { id, userId },
    include: {
      resume: {
        select: {
          id: true,
          fileName: true,
          isParsed: true,
        }
      }
    }
  });

  if (!session) {
    return res.status(404).json({
      code: 404,
      message: 'Interview session not found',
    });
  }

  res.status(200).json({
    code: 0,
    message: 'ok',
    data: {
      id: session.id,
      status: session.status,
      currentStage: session.currentStage,
      position: session.position,
      company: session.company,
      interviewType: session.interviewType,
      mode: session.mode,
      startTime: session.startTime,
      estimatedDuration: '45 minutes',
    }
  });
});

/**
 * @desc 恢复面试会话
 */
export const recoverInterview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const session = await prisma.interviewSession.findFirst({
    where: { id, userId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 50, // Limit to last 50 messages
      }
    }
  });

  if (!session) {
    return res.status(404).json({
      code: 404,
      message: 'Interview session not found',
    });
  }

  res.status(200).json({
    code: 0,
    message: 'ok',
    data: {
      sessionId: session.id,
      currentStage: session.currentStage,
      messages: session.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
      })),
    }
  });
});

/**
 * @desc 结束面试
 */
export const finishInterview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const session = await prisma.interviewSession.findFirst({
    where: { id, userId, status: 'in_progress' }
  });

  if (!session) {
    return res.status(404).json({
      code: 404,
      message: 'Interview session not found or not in progress',
    });
  }

  // Calculate duration
  const duration = session.startTime
    ? Math.floor((Date.now() - session.startTime.getTime()) / 1000)
    : 0;

  // Update session to completed
  const updatedSession = await prisma.interviewSession.update({
    where: { id },
    data: {
      status: 'completed',
      endTime: new Date(),
      duration,
    }
  });

  // Fetch all messages for report generation
  const messages = await prisma.interviewMessage.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: 'asc' },
  });

  const ctx = {
    position: session.position,
    company: session.company,
    interviewType: session.interviewType,
    difficulty: session.difficulty,
    focusAreas: session.focusAreas || [],
    currentStage: session.currentStage as string,
    resumeContent: undefined,
  };

  const reportData = await aiService.generateReport(ctx, messages.map(m => ({
    role: m.role,
    content: m.content,
    score: m.score,
  })));

  // Save report to DB
  await prisma.report.create({
    data: {
      sessionId: id,
      totalScore: reportData.totalScore,
      percentile: reportData.percentile,
      summary: reportData.summary,
      technicalScore: reportData.scoreBreakdown.technical,
      expressionScore: reportData.scoreBreakdown.expression,
      projectScore: reportData.scoreBreakdown.project,
      stabilityScore: reportData.scoreBreakdown.stability,
      strengths: reportData.strengths,
      weaknesses: reportData.weaknesses,
      suggestions: reportData.suggestions,
      weakTags: reportData.weakTags,
      recommendedTopics: reportData.recommendedTopics,
      status: 'ready',
    }
  });

  res.status(200).json({
    code: 0,
    message: 'ok',
    data: {
      sessionId: updatedSession.id,
      status: updatedSession.status,
      duration: updatedSession.duration,
      endTime: updatedSession.endTime,
    }
  });
});

/**
 * @desc 删除面试会话及其所有关联数据
 */
export const deleteInterview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const session = await prisma.interviewSession.findFirst({
    where: { id, userId },
  });

  if (!session) {
    return res.status(404).json({
      code: 404,
      message: 'Interview session not found',
    });
  }

  await prisma.interviewSession.delete({
    where: { id },
  });

  res.status(200).json({
    code: 0,
    message: 'Interview deleted',
  });
});
