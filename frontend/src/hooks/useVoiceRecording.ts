import { useState, useRef, useCallback } from 'react';

export const useVoiceRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const stopResolveRef = useRef<((blob: Blob | null) => void) | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = chunksRef.current.length
          ? new Blob(chunksRef.current, { type: 'audio/webm' })
          : null;
        setAudioBlob(blob);
        chunksRef.current = [];
        setIsRecording(false);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        if (stopResolveRef.current) {
          stopResolveRef.current(blob);
          stopResolveRef.current = null;
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setAudioBlob(null);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Microphone access denied. Please enable permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) {
      return Promise.resolve(null);
    }

    if (mediaRecorderRef.current.state === 'inactive') {
      return Promise.resolve(audioBlob);
    }

    return new Promise<Blob | null>((resolve) => {
      stopResolveRef.current = resolve;
      mediaRecorderRef.current?.stop();
    });
  }, [audioBlob]);

  const resetAudioBlob = useCallback(() => {
    setAudioBlob(null);
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    audioBlob,
    resetAudioBlob,
    error,
  };
};

