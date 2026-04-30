import { Server as SocketIOServer, Socket } from 'socket.io';
import { socketAuthMiddleware } from './auth.ws';
import prisma from '../utils/prisma.util';
import { aiService } from '../services/ai.service';
import { ttsService } from '../services/tts.service';
import { logger } from '../utils/logger.util';

interface InterviewContext {
  position: string;
  company?: string | null;
  interviewType: string;
  difficulty: number;
  focusAreas: string[];
  currentStage: string;
  resumeContent?: string | null;
}

const activeSessions = new Map<string, Set<string>>();

function buildContext(session: any): InterviewContext {
  return {
    position: session.position,
    company: session.company,
    interviewType: session.interviewType,
    difficulty: session.difficulty,
    focusAreas: session.focusAreas,
    currentStage: session.currentStage,
    resumeContent: session.resume?.content,
  };
}

export function setupWebSocket(io: SocketIOServer) {
  io.use(socketAuthMiddleware);

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    logger.info(`Socket connected: ${socket.id}, user: ${user.email}`);

    socket.on('join_session', async (sessionId: string) => {
      try {
        const session = await prisma.interviewSession.findUnique({
          where: { id: sessionId },
          include: { resume: true },
        });

        if (!session || session.userId !== user.id) {
          socket.emit('error', { message: 'Session not found or unauthorized' });
          return;
        }

        if (session.status !== 'in_progress') {
          socket.emit('error', { message: 'Session is not active' });
          return;
        }

        socket.join(sessionId);

        if (!activeSessions.has(sessionId)) {
          activeSessions.set(sessionId, new Set());
        }
        activeSessions.get(sessionId)!.add(socket.id);

        // Load existing messages, but hold back the latest AI question
        // (it will be sent after TTS synthesis together with audio)
        const messages = await prisma.interviewMessage.findMany({
          where: { sessionId },
          orderBy: { createdAt: 'asc' },
        });

        const lastAiQuestion = messages.filter(m => m.role === 'ai' && !m.feedback).pop();
        const displayMessages = lastAiQuestion
          ? messages.filter(m => m.id !== lastAiQuestion.id)
          : messages;

        socket.emit('session_joined', {
          sessionId,
          currentStage: session.currentStage,
          messages: displayMessages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            score: m.score,
            feedback: m.feedback,
            isFollowup: m.isFollowup,
            parentMsgId: m.parentMsgId,
          })),
        });

        // TTS: speak the latest AI question, emit question + audio together when ready
        if (lastAiQuestion?.content) {
          const questionData = { id: lastAiQuestion.id, content: lastAiQuestion.content, isFollowup: lastAiQuestion.isFollowup };
          ttsService.synthesize(lastAiQuestion.content, {
            onComplete: (audio) => {
              io.to(sessionId).emit('ai_question', questionData);
              if (audio.length > 0) {
                io.to(sessionId).emit('tts_audio', { audio: audio.toString('base64') });
              }
              io.to(sessionId).emit('tts_end');
            },
            onError: (errMsg) => {
              logger.error(`[TTS] Initial question TTS error: ${errMsg}`);
              io.to(sessionId).emit('ai_question', questionData);
              io.to(sessionId).emit('tts_end');
            },
          }).catch(err => {
            logger.error(`[TTS] Initial question TTS failed: ${err.message}`);
            io.to(sessionId).emit('ai_question', questionData);
            io.to(sessionId).emit('tts_end');
          });
        }

        logger.info(`User ${user.email} joined session ${sessionId}`);
      } catch (err: any) {
        socket.emit('error', { message: err.message || 'Failed to join session' });
      }
    });

    socket.on('user_message', async (data: { sessionId: string; content: string }) => {
      const { sessionId, content } = data;

      try {
        const session = await prisma.interviewSession.findUnique({
          where: { id: sessionId },
          include: { resume: true },
        });

        if (!session || session.userId !== user.id) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        // Save user message
        const userMsg = await prisma.interviewMessage.create({
          data: {
            sessionId,
            role: 'user',
            content,
          },
        });

        io.to(sessionId).emit('message_saved', {
          id: userMsg.id,
          role: 'user',
          content,
        });

        // Evaluate answer via AI
        const ctx = buildContext(session);

        // Find the last AI question for this session
        const lastQuestion = await prisma.interviewMessage.findFirst({
          where: { sessionId, role: 'ai' },
          orderBy: { createdAt: 'desc' },
        });

        const evaluation = await aiService.evaluateAnswer(
          ctx,
          lastQuestion?.content || '',
          content,
        );

        // Save feedback (score only, not shown in chat)
        const feedbackMsg = await prisma.interviewMessage.create({
          data: {
            sessionId,
            role: 'ai',
            content: evaluation.feedback,
            score: evaluation.score,
            feedback: evaluation.feedback,
          },
        });

        // Send score only (feedback text not displayed in chat)
        io.to(sessionId).emit('ai_score', {
          id: feedbackMsg.id,
          score: evaluation.score,
        });

        // Determine the next question text
        let ttsText = '';
        let questionData: any = null;
        if (evaluation.needsFollowup && evaluation.followup) {
          const followupMsg = await prisma.interviewMessage.create({
            data: {
              sessionId,
              role: 'ai',
              content: evaluation.followup.content,
              isFollowup: true,
              parentMsgId: lastQuestion?.id,
            },
          });
          questionData = { id: followupMsg.id, content: evaluation.followup.content, isFollowup: true };
          ttsText = evaluation.followup.content;
        } else {
          const nextQ = await aiService.generateQuestion(ctx);
          const nextMsg = await prisma.interviewMessage.create({
            data: {
              sessionId,
              role: 'ai',
              content: nextQ.content,
              questionId: nextQ.questionId,
            },
          });
          questionData = { id: nextMsg.id, content: nextQ.content };
          ttsText = nextQ.content;
        }

        // TTS first, then emit question + audio together when ready
        if (ttsText) {
          ttsService.synthesize(ttsText, {
            onComplete: (audio) => {
              io.to(sessionId).emit('ai_question', questionData);
              if (audio.length > 0) {
                io.to(sessionId).emit('tts_audio', { audio: audio.toString('base64') });
              }
              io.to(sessionId).emit('tts_end');
            },
            onError: (errMsg) => {
              logger.error(`[TTS] Synthesis error for session ${sessionId}: ${errMsg}`);
              // Still show question even if TTS fails
              io.to(sessionId).emit('ai_question', questionData);
              io.to(sessionId).emit('tts_end');
            },
          }).catch(err => {
            logger.error(`[TTS] Synthesis failed: ${err.message}`);
            io.to(sessionId).emit('ai_question', questionData);
            io.to(sessionId).emit('tts_end');
          });
        } else {
          io.to(sessionId).emit('ai_question', questionData);
        }
      } catch (err: any) {
        socket.emit('error', { message: err.message || 'Failed to process message' });
      }
    });

    socket.on('stage_change', async (data: { sessionId: string }) => {
      const { sessionId } = data;

      try {
        const session = await prisma.interviewSession.findUnique({
          where: { id: sessionId },
          include: { resume: true },
        });

        if (!session || session.userId !== user.id) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        const STAGE_ORDER = ['intro', 'project', 'technical', 'scenario', 'summary'];
        const currentIndex = STAGE_ORDER.indexOf(session.currentStage);

        if (currentIndex >= STAGE_ORDER.length - 1) {
          socket.emit('error', { message: 'Already at final stage' });
          return;
        }

        const newStage = STAGE_ORDER[currentIndex + 1];
        await prisma.interviewSession.update({
          where: { id: sessionId },
          data: { currentStage: newStage as any },
        });

        const ctx = buildContext({ ...session, currentStage: newStage });
        const nextQ = await aiService.generateQuestion(ctx);
        const nextMsg = await prisma.interviewMessage.create({
          data: {
            sessionId,
            role: 'ai',
            content: nextQ.content,
            questionId: nextQ.questionId,
          },
        });

        const questionData = { id: nextMsg.id, content: nextQ.content };
        ttsService.synthesize(nextQ.content, {
          onComplete: (audio) => {
            io.to(sessionId).emit('stage_changed', {
              newStage,
              question: questionData,
            });
            if (audio.length > 0) {
              io.to(sessionId).emit('tts_audio', { audio: audio.toString('base64') });
            }
            io.to(sessionId).emit('tts_end');
          },
          onError: (errMsg) => {
            logger.error(`[TTS] Stage change TTS error: ${errMsg}`);
            io.to(sessionId).emit('stage_changed', {
              newStage,
              question: questionData,
            });
            io.to(sessionId).emit('tts_end');
          },
        }).catch(err => {
          logger.error(`[TTS] Stage change failed: ${err.message}`);
          io.to(sessionId).emit('stage_changed', {
            newStage,
            question: questionData,
          });
          io.to(sessionId).emit('tts_end');
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message || 'Failed to change stage' });
      }
    });

    socket.on('end_session', async (data: { sessionId: string }) => {
      const { sessionId } = data;

      try {
        const session = await prisma.interviewSession.findUnique({
          where: { id: sessionId },
          include: { resume: true },
        });

        if (!session || session.userId !== user.id) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        await prisma.interviewSession.update({
          where: { id: sessionId },
          data: {
            status: 'completed',
            endTime: new Date(),
            duration: session.startTime
              ? Math.floor((Date.now() - session.startTime.getTime()) / 1000)
              : null,
          },
        });

        // Generate report BEFORE emitting session_ended, so report is ready when frontend navigates
        const messages = await prisma.interviewMessage.findMany({
          where: { sessionId },
          orderBy: { createdAt: 'asc' },
        });
        const ctx = buildContext(session);
        try {
          const reportData = await aiService.generateReport(ctx, messages.map(m => ({
            role: m.role,
            content: m.content,
            score: m.score,
          })));
          await prisma.report.create({
            data: {
              sessionId,
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
          logger.info(`[Report] Generated for session ${sessionId}`);
        } catch (err: any) {
          logger.error(`[Report] Generation failed for session ${sessionId}: ${err.message}`);
        }

        io.to(sessionId).emit('session_ended', { sessionId });

        // Clean up active connections for this session
        const connections = activeSessions.get(sessionId);
        if (connections) {
          for (const socketId of connections) {
            const s = io.sockets.sockets.get(socketId);
            if (s) s.leave(sessionId);
          }
          activeSessions.delete(sessionId);
        }
      } catch (err: any) {
        socket.emit('error', { message: err.message || 'Failed to end session' });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);

      // Clean up from all active sessions
      for (const [sessionId, connections] of activeSessions.entries()) {
        connections.delete(socket.id);
        if (connections.size === 0) {
          activeSessions.delete(sessionId);
        }
      }
    });
  });
}