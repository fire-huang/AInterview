import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Button, Card } from '../components/UI';
import { interview, question } from '../services/api';
import { STAGE_ORDER, STAGE_LABELS } from '../constants';
import { cn } from '../lib/utils';
import { useSocketIO, UseSocketIOOptions } from '../hooks/useSocketIO';
import { useAlibabaSTT } from '../hooks/useAlibabaSTT';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle2, Circle, ChevronRight, Wifi, WifiOff, Mic, MicOff, Volume2 } from 'lucide-react';
import { useStreamingAudio } from '../hooks/useStreamingAudio';

const InterviewRoom: React.FC = () => {
  const { t, language } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [messages, setMessages] = useState<any[]>([]);
  const [currentStage, setCurrentStage] = useState('');
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState('');
  const [interimText, setInterimText] = useState('');
  const [accumulatedText, setAccumulatedText] = useState('');
  const [useWS, setUseWS] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // STT handlers — accumulate text during recording, send on release
  const sttHandlers = {
    onRecognizing: (text: string) => {
      setInterimText(text);
    },
    onRecognized: (text: string) => {
      setInterimText('');
      if (!text.trim()) return;
      setAccumulatedText(prev => prev ? prev + ' ' + text.trim() : text.trim());
    },
    onError: (errMsg: string) => {
      if (errMsg.toLowerCase().includes('parse') || errMsg.toLowerCase().includes('failed')) {
        setError(t('room.sttError') || '识别失败，请重新说');
        setInterimText('');
        setAccumulatedText('');
      } else {
        setError(errMsg);
      }
    },
  };

  const { isListening, isReady, audioLevel, startListening, stopListening } = useAlibabaSTT(sttHandlers);

  // Streaming audio playback for TTS
  const { isPlaying: isTtsPlaying, playAudio, stopPlaying: stopTts } = useStreamingAudio({
    onPlayStart: () => {
      if (isListening) stopListening();
    },
  });

  // Socket.IO handlers
  const socketHandlers: UseSocketIOOptions = {
    onMessageSaved: (data: any) => {
      setMessages(prev => {
        if (prev.some(m => m.id === data.id || (m.role === 'user' && m.content === data.content))) return prev;
        return [...prev, { id: data.id, role: data.role, content: data.content }];
      });
      setSending(false);
    },
    onAIScore: (data: { id: string; score: number }) => {
      // Score received, not displayed in chat
    },
    onAIQuestion: (data: any) => {
      setMessages(prev => {
        const cleaned = prev.filter(m => m.id !== 'ai-thinking');
        return [...cleaned, {
          id: data.id,
          role: 'ai',
          content: data.content,
          isFollowup: data.isFollowup,
        }];
      });
      setSending(false);
    },
    onStageChanged: (data: any) => {
      setCurrentStage(data.newStage);
      if (data.question) {
        setMessages(prev => [...prev, {
          id: data.question.id,
          role: 'ai',
          content: data.question.content,
        }]);
      }
      setSending(false);
    },
    onSessionEnded: () => {
      navigate(`/report?sessionId=${sessionId}`);
    },
    onSessionJoined: (data: any) => {
      setCurrentStage(data.currentStage);
      if (data.messages?.length > 0) {
        setMessages(data.messages
          .filter((m: any) => !(m.feedback && m.role === 'ai'))
          .map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            isFollowup: m.isFollowup,
          })));
      }
      // Show thinking while TTS prepares initial question
      setSending(true);
    },
    onError: (data: { message: string }) => {
      setError(data.message);
      setSending(false);
    },
    onTtsAudio: (data: { audio: string }) => {
      playAudio(data.audio);
    },
    onTtsEnd: () => {
      // Audio playback handles its own end via onended
    },
  };

  const { connected, connect, disconnect, joinSession, sendUserMessage, changeStage, endSession } = useSocketIO(socketHandlers);

  // Initialize interview
  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const sessionRes = await interview.get(sessionId);
        const session = sessionRes.data?.session || sessionRes.data;
        setSessionInfo(session);
        setCurrentStage(session?.currentStage || '');

        const token = localStorage.getItem('ainterview_token');
        if (token) {
          connect();
          setUseWS(true);
        }

        // Don't load initial question separately — recover/session_joined will load it
      } catch (err: any) {
        setError(err.message || 'Failed to load interview');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  // Join Socket.IO session once connected
  useEffect(() => {
    if (connected && sessionId && useWS) {
      joinSession(sessionId);
    }
  }, [connected, sessionId, useWS, joinSession]);

  // Send accumulated text after recording ends
  const handleSendAccumulated = useCallback(async () => {
    const finalText = accumulatedText.trim() + (interimText.trim() ? ' ' + interimText.trim() : '');
    setInterimText('');
    setAccumulatedText('');

    if (!finalText || !sessionId) return;

    const userMsgId = 'u-' + Date.now();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: finalText }]);
    setSending(true);
    setError('');

    if (useWS && connected) {
      sendUserMessage(sessionId, finalText);
    } else {
      try {
        const res = await question.answer(sessionId, finalText);
        const { evaluation, followup } = res.data || {};
        if (evaluation?.feedback) {
          setMessages(prev => [...prev, {
            id: 'eval-' + Date.now(),
            role: 'ai',
            content: evaluation.feedback,
            isFeedback: true,
          }]);
        }
        if (followup?.content) {
          setMessages(prev => [...prev, {
            id: followup.questionId || 'fq-' + Date.now(),
            role: 'ai',
            content: followup.content,
          }]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to submit answer');
        setMessages(prev => prev.filter(m => m.id !== userMsgId));
      } finally {
        setSending(false);
      }
    }
  }, [accumulatedText, interimText, sessionId, useWS, connected, sendUserMessage]);

  // Push-to-talk: hold Space to start listening, release to stop and send accumulated text
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !e.repeat && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        if (!isListening) startListening();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        if (isListening) {
          stopListening();
          // Send after a small delay so onRecognized from stopListening fires first
          setTimeout(() => handleSendAccumulated(), 300);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isListening, startListening, stopListening, handleSendAccumulated]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      stopListening();
    };
  }, [disconnect]);

  const handleNextStage = async () => {
    if (!sessionId) return;
    setSending(true);
    setError('');

    if (useWS && connected) {
      changeStage(sessionId);
    } else {
      try {
        const res = await question.nextStage(sessionId);
        const data: any = res.data;
        const newStage = data?.newStage || data?.stage;
        setCurrentStage(newStage);

        const nextQuestion = data?.nextQuestion || data?.question;
        if (nextQuestion?.content) {
          setMessages(prev => [...prev, {
            id: nextQuestion.questionId || 'ns-' + Date.now(),
            role: 'ai',
            content: nextQuestion.content,
          }]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to advance stage');
      } finally {
        setSending(false);
      }
    }
  };

  const handleEnd = async () => {
    if (!window.confirm(t('room.confirmEnd'))) return;

    if (!sessionId) {
      navigate('/report');
      return;
    }
    setEnding(true);

    if (useWS && connected) {
      endSession(sessionId);
    } else {
      try {
        await interview.finish(sessionId);
        navigate(`/report?sessionId=${sessionId}`);
      } catch (err: any) {
        setError(err.message || 'Failed to end interview');
        setEnding(false);
      }
    }
  };

  const currentStageIndex = STAGE_ORDER.indexOf(currentStage);

  const getStageName = (stageKey: string) => {
    const label = STAGE_LABELS[stageKey];
    return label ? label[language] : stageKey;
  };

  // No sessionId state
  if (!sessionId && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 rounded-xl text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-orange-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{t('room.title')} - No Session</h2>
          <p className="text-sm text-gray-500">Please create an interview session first.</p>
          <Button onClick={() => navigate('/create')} className="rounded-xl">
            Create Interview
          </Button>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Preparing your interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 h-14 flex items-center px-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
            AI
          </div>
          <h1 className="text-base font-bold text-gray-900">{t('room.title')}</h1>
          {sessionInfo?.position && (
            <span className="text-xs text-gray-400 ml-2">
              {sessionInfo.position}{sessionInfo.company ? ` @ ${sessionInfo.company}` : ''}
            </span>
          )}
        </div>
        {/* Connection + mic/TTS indicators */}
        <div className="ml-auto flex items-center gap-3 text-xs">
          {isTtsPlaying && (
            <span className="flex items-center gap-1 text-green-600 animate-pulse">
              <Volume2 className="w-3.5 h-3.5" /> AI Speaking
            </span>
          )}
          {isListening ? (
            <span className="flex items-center gap-1 text-blue-600">
              <Mic className="w-3.5 h-3.5" /> {t('room.listening')}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-gray-400">
              <MicOff className="w-3.5 h-3.5" /> {t('room.micOff')}
            </span>
          )}
          {useWS ? (
            connected ? (
              <span className="flex items-center gap-1 text-green-600">
                <Wifi className="w-3.5 h-3.5" /> Real-time
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-500">
                <WifiOff className="w-3.5 h-3.5" /> Reconnecting...
              </span>
            )
          ) : (
            <span className="text-gray-400">REST mode</span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full grid grid-cols-12 gap-6 px-6 py-6" style={{ height: 'calc(100vh - 3.5rem)' }}>
        {/* Sidebar: stage progress + actions */}
        <div className="col-span-3 space-y-4 overflow-y-auto">
          <Card className="p-4 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-gray-900">{t('room.progress')}</h3>
            <div className="space-y-3">
              {STAGE_ORDER.map((stage, idx) => {
                const isCompleted = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;

                return (
                  <div key={stage} className="flex items-center gap-3">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : isCurrent ? (
                      <Circle className="w-5 h-5 text-blue-500 fill-blue-500 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300 shrink-0" />
                    )}
                    <span className={cn(
                      'text-sm',
                      isCompleted ? 'text-green-600 font-medium' :
                      isCurrent ? 'text-blue-600 font-bold' :
                      'text-gray-400'
                    )}>
                      {getStageName(stage)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Next Stage Button */}
            {currentStageIndex >= 0 && currentStageIndex < STAGE_ORDER.length - 1 && (
              <div className="pt-3 border-t border-gray-100">
                <Button
                  onClick={handleNextStage}
                  disabled={sending}
                  className="w-full rounded-xl text-sm"
                  size="sm"
                >
                  {sending ? '...' : t('room.nextStage')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {/* End Interview Button */}
            <div className="pt-3 border-t border-gray-100">
              <Button
                onClick={handleEnd}
                disabled={ending}
                variant="outline"
                className="w-full rounded-xl text-red-500 border-red-200 hover:bg-red-50 text-sm"
                size="sm"
              >
                {ending ? '...' : t('room.endSession')}
              </Button>
            </div>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="col-span-9 flex flex-col overflow-hidden">
          <Card className="p-4 rounded-xl flex-1 flex flex-col overflow-hidden">
            {/* Message list */}
            <div className="flex-1 overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div className={cn(
                    'px-4 py-3 text-sm max-w-[80%] rounded-xl',
                    msg.isFeedback
                      ? 'bg-green-50 text-green-800 border border-green-100'
                      : msg.role === 'ai'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-800 border border-gray-100'
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {/* Accumulated + interim STT text (user is still speaking) */}
              {(accumulatedText || interimText) && (
                <div className="flex justify-end">
                  <div className="px-4 py-3 text-sm max-w-[80%] rounded-xl bg-gray-50 text-gray-400 italic">
                    {accumulatedText}{interimText ? (accumulatedText ? ' ' : '') + interimText : ''}
                  </div>
                </div>
              )}
              {/* Sending indicator */}
              {sending && !interimText && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 text-sm rounded-xl bg-blue-50 text-blue-400">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    AI is thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Error display */}
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-2 rounded-xl text-sm flex items-center gap-2 mt-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Voice input area */}
            <div className="border-t border-gray-100 pt-4 mt-4">
              {isListening ? (
                <div className="flex items-center gap-3">
                  <Mic className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">{t('room.listening')}</span>
                  {/* Sound wave bars */}
                  <div className="flex items-end gap-1 h-6 ml-1">
                    {[0.7, 1, 0.6, 0.9, 0.5].map((scale, i) => (
                      <div
                        key={i}
                        className="w-2 rounded-full bg-blue-500 transition-all duration-150 ease-out"
                        style={{ height: `${Math.max(4, audioLevel * 24 * scale)}px` }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={stopListening}
                    className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <MicOff className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <MicOff className="w-5 h-5 text-gray-300" />
                  <span className="text-sm text-gray-400">{t('room.micOff')}</span>
                  <button
                    onClick={startListening}
                    className="px-3 py-1.5 text-xs bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all border border-gray-200 hover:border-blue-300"
                  >
                    <Mic className="w-3.5 h-3.5 inline mr-0.5" /> {language === 'zh' ? '开启' : 'Start'}
                  </button>
                  <span className="text-xs text-gray-300">{t('room.voiceHint')}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default InterviewRoom;