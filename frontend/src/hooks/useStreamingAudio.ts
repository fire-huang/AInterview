import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseStreamingAudioOptions {
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
}

export function useStreamingAudio(options: UseStreamingAudioOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const stopPlaying = useCallback(() => {
    if (currentSourceRef.current) {
      try { currentSourceRef.current.stop(); } catch {}
      currentSourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playAudio = useCallback(async (base64Audio: string) => {
    try {
      // Stop any currently playing audio
      stopPlaying();

      const ctx = audioContextRef.current || new AudioContext();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Decode base64 → ArrayBuffer → AudioBuffer
      const binaryStr = atob(base64Audio);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      source.onended = () => {
        currentSourceRef.current = null;
        setIsPlaying(false);
        optionsRef.current.onPlayEnd?.();
      };

      currentSourceRef.current = source;
      source.start();
      setIsPlaying(true);
      optionsRef.current.onPlayStart?.();
    } catch (err) {
      console.error('[StreamingAudio] Play error:', err);
      setIsPlaying(false);
    }
  }, [stopPlaying]);

  useEffect(() => {
    return () => {
      stopPlaying();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [stopPlaying]);

  return { isPlaying, playAudio, stopPlaying };
}