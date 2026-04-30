import { Request, Response } from 'express';
import prisma from '../utils/prisma.util';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { aiService } from '../services/ai.service';

function buildContext(session: any) {
  return {
    position: session.position,
    company: session.company,
    interviewType: session.interviewType,
    difficulty: session.difficulty,
    focusAreas: session.focusAreas || [],
    currentStage: session.currentStage as string,
    resumeContent: session.resume?.content ?? undefined,
  };
}

/**
 * @desc 获取当前问题
 */
export const getCurrentQuestion = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;
  const userId = req.user!.id;

  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      resume: { select: { content: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  if (!session) {
    return res.status(404).json({
      code: 404,
      message: 'Interview session not found',
    });
  }

  if (session.status !== 'in_progress') {
    return res.status(400).json({
      code: 400,
      message: 'Interview session is not in progress',
    });
  }

  const ctx = buildContext(session);
  const question = await aiService.generateQuestion(ctx);

  // Save AI question as a message
  await prisma.interviewMessage.create({
    data: {
      sessionId,
      role: 'ai',
      content: question.content,
      questionId: question.questionId,
    }
  });

  res.status(200).json({
    code: 0,
    message: 'ok',
    data: question,
  });
});

/**
 * @desc 提交回答
 */
export const submitAnswer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;
  const { content } = req.body;
  const userId = req.user!.id;

  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId, status: 'in_progress' },
    include: {
      resume: { select: { content: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  if (!session) {
    return res.status(404).json({
      code: 404,
      message: 'Interview session not found or not in progress',
    });
  }

  // Save user answer
  const answerMessage = await prisma.interviewMessage.create({
    data: {
      sessionId,
      role: 'user',
      content,
    }
  });

  // Find the last AI question for evaluation context
  const lastAiMessage = session.messages.find((m: any) => m.role === 'ai');
  const ctx = buildContext(session);

  const evaluation = await aiService.evaluateAnswer(
    ctx,
    lastAiMessage?.content || '',
    content,
  );

  // Save score and feedback on the user message
  await prisma.interviewMessage.update({
    where: { id: answerMessage.id },
    data: {
      score: evaluation.score,
      feedback: evaluation.feedback,
    }
  });

  // If followup needed, save followup question as AI message
  if (evaluation.needsFollowup && evaluation.followup) {
    await prisma.interviewMessage.create({
      data: {
        sessionId,
        role: 'ai',
        content: evaluation.followup.content,
        questionId: evaluation.followup.questionId,
        isFollowup: true,
      }
    });
  }

  res.status(201).json({
    code: 0,
    message: 'ok',
    data: {
      answerId: answerMessage.id,
      evaluation: {
        score: evaluation.score,
        feedback: evaluation.feedback,
      },
      followup: evaluation.needsFollowup && evaluation.followup
        ? { questionId: evaluation.followup.questionId, content: evaluation.followup.content }
        : undefined,
    },
  });
});

/**
 * @desc 触发追问
 */
export const triggerFollowup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;
  const userId = req.user!.id;

  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId, status: 'in_progress' },
    include: {
      resume: { select: { content: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  if (!session) {
    return res.status(404).json({
      code: 404,
      message: 'Interview session not found or not in progress',
    });
  }

  // Find last AI question and user answer for context
  const lastAiMsg = session.messages.find((m: any) => m.role === 'ai');
  const lastUserMsg = session.messages.find((m: any) => m.role === 'user');
  const ctx = buildContext(session);

  const followup = await aiService.generateFollowup(
    ctx,
    lastAiMsg?.content || '',
    lastUserMsg?.content || '',
  );

  // Save followup as AI message
  await prisma.interviewMessage.create({
    data: {
      sessionId,
      role: 'ai',
      content: followup.content,
      questionId: followup.questionId,
      isFollowup: true,
    }
  });

  res.status(201).json({
    code: 0,
    message: 'ok',
    data: followup,
  });
});

/**
 * @desc 推进到下一阶段
 */
export const nextStage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;
  const userId = req.user!.id;

  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId, status: 'in_progress' },
    include: {
      resume: { select: { content: true } },
    }
  });

  if (!session) {
    return res.status(404).json({
      code: 404,
      message: 'Interview session not found or not in progress',
    });
  }

  const stageOrder = ['intro', 'project', 'technical', 'scenario', 'summary'];
  const currentIndex = stageOrder.indexOf(session.currentStage);
  const newStage = currentIndex < stageOrder.length - 1
    ? stageOrder[currentIndex + 1]
    : 'summary';

  const updatedSession = await prisma.interviewSession.update({
    where: { id: sessionId },
    data: { currentStage: newStage as any }
  });

  const ctx = buildContext(updatedSession);
  const nextQuestion = await aiService.generateNextStageQuestion(ctx);

  // Save next question as AI message
  await prisma.interviewMessage.create({
    data: {
      sessionId,
      role: 'ai',
      content: nextQuestion.content,
      questionId: nextQuestion.questionId,
    }
  });

  res.status(200).json({
    code: 0,
    message: 'ok',
    data: {
      sessionId: updatedSession.id,
      newStage: updatedSession.currentStage,
      nextQuestion,
    },
  });
});