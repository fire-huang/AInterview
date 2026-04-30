import { useState, useRef, useCallback, useEffect } from 'react';
import { dashscope } from '../services/api';

export interface UseAlibabaSTTOptions {
  onRecognized?: (text: string) => void;
  onRecognizing?: (text: string) => void;
  onError?: (error: string) => void;
}

export interface UseAlibabaSTTReturn {
  isListening: boolean;
  isReady: boolean;
  audioLevel: number;
  startListening: () => void;
  stopListening: () => void;
  error: string;
}

function generateTaskId(): string {
  return Math.random().toString(16).substring(2, 18) +
    Math.random().toString(16).substring(2, 18);
}

function generateMessageId(): string {
  return Math.random().toString(16).substring(2, 34);
}

export function useAlibabaSTT(options: UseAlibabaSTTOptions = {}): UseAlibabaSTTReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const taskIdRef = useRef<string>('');
  const taskStartedRef = useRef(false);

  const [isListening, setIsListening] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState('');

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const cleanup = useCallback(() => {
    taskStartedRef.current = false;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsListening(false);
    setAudioLevel(0);
  }, []);

  const startListening = useCallback(async () => {
    try {
      const configRes = await dashscope.getConfig();
      const configData: any = configRes.data;
      const wsUrl = configData.wsUrl || '/api/dashscope/stt-proxy';
      const sttModel = configData.sttModel || 'paraformer-realtime-v2';
      const languageHints = configData.languageHints || ['zh', 'en'];

      // Use JWT token to authenticate with our backend proxy
      const jwtToken = localStorage.getItem('ainterview_token');
      if (!jwtToken) {
        optionsRef.current.onError?.('Not authenticated');
        return;
      }

      // Build WebSocket URL — connect directly to backend to bypass Vite WS proxy issues
      const backendPort = import.meta.env.VITE_BACKEND_PORT || '3001';
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = `${proto}//${window.location.hostname}:${backendPort}`;
      const fullWsUrl = `${wsHost}${wsUrl}?token=${encodeURIComponent(jwtToken)}`;

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      streamRef.current = stream;

      // Use default sample rate (Firefox/Safari ignore sampleRate option)
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const taskId = generateTaskId();
      taskIdRef.current = taskId;
      taskStartedRef.current = false;

      const ws = new WebSocket(fullWsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        const runTaskCmd = {
          header: {
            action: 'run-task',
            task_id: taskId,
            streaming: 'duplex',
          },
          payload: {
            task_group: 'audio',
            task: 'asr',
            function: 'recognition',
            model: sttModel,
            parameters: {
              format: 'pcm',
              sample_rate: 16000,
              enable_intermediate_result: true,
              enable_punctuation_prediction: true,
              enable_inverse_text_normalization: true,
              language_hints: languageHints,
            },
            input: {},
          },
        };
        ws.send(JSON.stringify(runTaskCmd));
      };

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data);
            // DashScope uses header.event in server responses
            const eventName = msg.header?.event || msg.header?.action;

            if (eventName === 'task-started') {
              taskStartedRef.current = true;
              setIsListening(true);
              setIsReady(true);
            } else if (eventName === 'result-generated') {
              const sentence = msg.payload?.output?.sentence;
              if (sentence) {
                const text = sentence.text || '';
                const isFinal = sentence.sentence_end || false;
                if (text) {
                  if (isFinal) {
                    optionsRef.current.onRecognized?.(text);
                  } else {
                    optionsRef.current.onRecognizing?.(text);
                  }
                }
              }
            } else if (eventName === 'task-finished' || eventName === 'task-complete') {
              setIsListening(false);
            } else if (eventName === 'task-failed' || msg.header?.status_code >= 40000000) {
              const errMsg = msg.header?.error_message || msg.header?.status_message || msg.header?.message || 'STT task failed';
              optionsRef.current.onError?.(errMsg);
              setIsListening(false);
            }
          } catch {
            // Ignore non-JSON messages
          }
        }
      };

      ws.onerror = () => {
        optionsRef.current.onError?.('WebSocket connection error');
        cleanup();
      };

      ws.onclose = () => {
        setIsListening(false);
      };

      // PCM audio capture with resampling → WebSocket binary frames
      const targetRate = 16000;
      processor.onaudioprocess = (e) => {
        if (!taskStartedRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Calculate audio level for UI visualization
        const rms = Math.sqrt(inputData.reduce((sum, v) => sum + v * v, 0) / inputData.length);
        setAudioLevel(Math.min(1, rms * 5));

        const actualRate = audioContext.sampleRate;

        // Resample from actualRate to 16kHz if needed
        let pcmData: Int16Array;
        if (actualRate === targetRate) {
          pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
        } else {
          const ratio = actualRate / targetRate;
          const outputLength = Math.round(inputData.length / ratio);
          const resampled = new Float32Array(outputLength);
          for (let i = 0; i < outputLength; i++) {
            const srcIdx = i * ratio;
            const idx = Math.floor(srcIdx);
            const frac = srcIdx - idx;
            resampled[i] = (idx + 1 < inputData.length)
              ? inputData[idx] * (1 - frac) + inputData[idx + 1] * frac
              : inputData[idx];
          }
          pcmData = new Int16Array(resampled.length);
          for (let i = 0; i < resampled.length; i++) {
            const s = Math.max(-1, Math.min(1, resampled[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
        }

        wsRef.current.send(pcmData.buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

    } catch (err: any) {
      optionsRef.current.onError?.(err.message || 'Failed to start STT');
      cleanup();
    }
  }, [cleanup]);

  const stopListening = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const finishCmd = {
        header: {
          action: 'finish-task',
          task_id: taskIdRef.current,
          message_id: generateMessageId(),
        },
        payload: {},
      };
      ws.send(JSON.stringify(finishCmd));
    }
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { isListening, isReady, audioLevel, startListening, stopListening, error };
}