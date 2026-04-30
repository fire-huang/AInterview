import WebSocket from 'ws';
import { logger } from '../utils/logger.util';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || '';
const DASHSCOPE_WS_URL = process.env.DASHSCOPE_WS_URL || 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/';

const TTS_MODEL = process.env.TTS_MODEL || 'cosyvoice-v2';
const TTS_VOICE = process.env.TTS_VOICE || 'longxiaochun_v2';
const TTS_FORMAT = process.env.TTS_FORMAT || 'mp3';

interface TTSCallbacks {
  onComplete: (audio: Buffer) => void;
  onError: (error: string) => void;
}

function generateTaskId(): string {
  return Math.random().toString(16).substring(2, 18) +
    Math.random().toString(16).substring(2, 18);
}

function parseWsMessage(data: WebSocket.Data): { type: 'json'; msg: any } | { type: 'audio'; buf: Buffer } {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
  try {
    const text = buf.toString('utf8');
    if (text.startsWith('{')) {
      const msg = JSON.parse(text);
      return { type: 'json', msg };
    }
  } catch {}
  return { type: 'audio', buf };
}

export const ttsService = {
  async synthesize(text: string, callbacks: TTSCallbacks): Promise<void> {
    if (!DASHSCOPE_API_KEY) {
      callbacks.onError('DashScope API key not configured');
      return;
    }

    if (!text.trim()) {
      callbacks.onComplete(Buffer.alloc(0));
      return;
    }

    const taskId = generateTaskId();
    const audioChunks: Buffer[] = [];

    const ws = new WebSocket(DASHSCOPE_WS_URL, {
      headers: {
        Authorization: `bearer ${DASHSCOPE_API_KEY}`,
      },
    });

    const completePromise = new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({
          header: { action: 'run-task', task_id: taskId, streaming: 'duplex' },
          payload: {
            task_group: 'audio', task: 'tts', function: 'SpeechSynthesizer',
            model: TTS_MODEL,
            parameters: { text_type: 'PlainText', format: TTS_FORMAT, voice: TTS_VOICE },
            input: {},
          },
        }));
      });

      ws.on('message', (data: WebSocket.Data) => {
        const parsed = parseWsMessage(data);

        if (parsed.type === 'json') {
          const msg = parsed.msg;
          const eventName = msg.header?.event || msg.header?.action;

          if (eventName === 'task-started') {
            logger.info(`[TTS] Task started: ${taskId}`);
            ws.send(JSON.stringify({
              header: { action: 'continue-task', task_id: taskId, streaming: 'duplex' },
              payload: { input: { text } },
            }));
            setTimeout(() => {
              ws.send(JSON.stringify({
                header: { action: 'finish-task', task_id: taskId, streaming: 'duplex' },
                payload: { input: {} },
              }));
            }, 500);
          } else if (eventName === 'task-finished' || eventName === 'task-complete') {
            logger.info(`[TTS] Task finished: ${taskId}, audio size: ${audioChunks.length} chunks`);
            callbacks.onComplete(Buffer.concat(audioChunks));
            resolve();
            ws.close();
          } else if (eventName === 'task-failed') {
            const errMsg = msg.header?.error_message || 'TTS task failed';
            logger.error(`[TTS] Task failed: ${errMsg}`);
            callbacks.onError(errMsg);
            reject(new Error(errMsg));
            ws.close();
          }
        } else {
          // Collect audio binary chunks
          audioChunks.push(parsed.buf);
        }
      });

      ws.on('error', (err) => {
        logger.error(`[TTS] WebSocket error: ${err.message}`);
        callbacks.onError(err.message);
        reject(err);
      });

      ws.on('close', () => {
        resolve();
      });
    });

    const timeout = setTimeout(() => {
      ws.close();
      callbacks.onError('TTS timeout');
    }, 30000);

    try {
      await completePromise;
    } finally {
      clearTimeout(timeout);
    }
  },

  getConfig() {
    return { model: TTS_MODEL, voice: TTS_VOICE, format: TTS_FORMAT };
  },
};