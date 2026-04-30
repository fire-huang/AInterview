import { Request, Response } from 'express';
import prisma from '../utils/prisma.util';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { aiService } from '../services/ai.service';

/**
 * @desc 获取面试报告
 */
export const getReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;
  const userId = req.user!.id;

  // Verify the session belongs to the user
  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId }
  });

  if (!session) {
    return res.status(404).json({
      code: 404,
      message: 'Interview session not found',
    });
  }

  const report = await prisma.report.findFirst({
    where: { sessionId }
  });

  if (!report) {
    return res.status(404).json({
      code: 404,
      message: 'Report not found',
    });
  }

  res.status(200).json({
    code: 0,
    message: 'ok',
    data: {
      sessionId: report.sessionId,
      status: report.status,
      totalScore: report.totalScore,
      percentile: report.percentile,
      scoreBreakdown: {
        technical: report.technicalScore,
        expression: report.expressionScore,
        project: report.projectScore,
        stability: report.stabilityScore,
      },
      summary: report.summary,
      strengths: report.strengths,
      weaknesses: report.weaknesses,
      suggestions: report.suggestions,
      weakTags: report.weakTags,
      recommendedTopics: report.recommendedTopics,
    }
  });
});

/**
 * @desc 重新生成报告
 */
export const regenerateReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;
  const userId = req.user!.id;

  // Check if session exists and belongs to user
  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId, status: 'completed' }
  });

  if (!session) {
    return res.status(404).json({
      code: 404,
      message: 'Interview session not found or not completed',
    });
  }

  const report = await prisma.report.findFirst({
    where: { sessionId }
  });

  if (!report) {
    return res.status(404).json({
      code: 404,
      message: 'Report not found',
    });
  }

  // Fetch all messages
  const messages = await prisma.interviewMessage.findMany({
    where: { sessionId },
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

  // Update report with AI-generated content
  const updatedReport = await prisma.report.update({
    where: { id: report.id },
    data: {
      status: 'ready',
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
      retryCount: report.retryCount + 1,
    }
  });

  res.status(200).json({
    code: 0,
    message: 'ok',
    data: {
      report: {
        sessionId: updatedReport.sessionId,
        status: updatedReport.status,
        totalScore: updatedReport.totalScore,
        percentile: updatedReport.percentile,
        scoreBreakdown: {
          technical: updatedReport.technicalScore,
          expression: updatedReport.expressionScore,
          project: updatedReport.projectScore,
          stability: updatedReport.stabilityScore,
        },
        summary: updatedReport.summary,
        strengths: updatedReport.strengths,
        weaknesses: updatedReport.weaknesses,
        suggestions: updatedReport.suggestions,
        weakTags: updatedReport.weakTags,
        recommendedTopics: updatedReport.recommendedTopics,
      }
    }
  });
});
