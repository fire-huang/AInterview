import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface UseSocketIOOptions {
  onSessionJoined?: (data: any) => void;
  onMessageSaved?: (data: any) => void;
  onAIScore?: (data: { id: string; score: number }) => void;
  onAIQuestion?: (data: any) => void;
  onAITextPartial?: (data: { text: string }) => void;
  onTtsAudio?: (data: { audio: string }) => void;
  onTtsEnd?: () => void;
  onStageChanged?: (data: any) => void;
  onSessionEnded?: (data: any) => void;
  onError?: (data: { message: string }) => void;
}

export function useSocketIO(options: UseSocketIOOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const optionsRef = useRef(options);
  const [connected, setConnected] = useState(false);

  // Keep options ref always up-to-date so event handlers use latest callbacks
  optionsRef.current = options;

  const connect = useCallback(() => {
    const token = localStorage.getItem('ainterview_token');
    if (!token) return;

    const socket = io('http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      setConnected(true);
      console.log('Socket.IO connected:', socket.id);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('Socket.IO disconnected');
    });

    // Use optionsRef.current instead of options directly, so handlers always
    // call the latest callback (e.g. navigate after re-render)
    socket.on('session_joined', (data) => optionsRef.current.onSessionJoined?.(data));
    socket.on('message_saved', (data) => optionsRef.current.onMessageSaved?.(data));
    socket.on('ai_score', (data) => optionsRef.current.onAIScore?.(data));
    socket.on('ai_question', (data) => optionsRef.current.onAIQuestion?.(data));
    socket.on('ai_text_partial', (data) => optionsRef.current.onAITextPartial?.(data));
    socket.on('tts_audio', (data) => optionsRef.current.onTtsAudio?.(data));
    socket.on('tts_end', () => optionsRef.current.onTtsEnd?.());
    socket.on('stage_changed', (data) => optionsRef.current.onStageChanged?.(data));
    socket.on('session_ended', (data) => optionsRef.current.onSessionEnded?.(data));
    socket.on('error', (data) => optionsRef.current.onError?.(data));

    socketRef.current = socket;
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  }, []);

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current && connected) {
      socketRef.current.emit(event, data);
    }
  }, [connected]);

  const joinSession = useCallback((sessionId: string) => {
    emit('join_session', sessionId);
  }, [emit]);

  const sendUserMessage = useCallback((sessionId: string, content: string) => {
    emit('user_message', { sessionId, content });
  }, [emit]);

  const changeStage = useCallback((sessionId: string) => {
    emit('stage_change', { sessionId });
  }, [emit]);

  const endSession = useCallback((sessionId: string) => {
    emit('end_session', { sessionId });
  }, [emit]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connected,
    connect,
    disconnect,
    joinSession,
    sendUserMessage,
    changeStage,
    endSession,
  };
}