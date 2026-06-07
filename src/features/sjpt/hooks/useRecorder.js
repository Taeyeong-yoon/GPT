import { useState, useRef, useCallback } from 'react';
import { blobToBase64, isTooShort } from '../../../utils/audioUtils';
import { transcribe } from '../../../services/stt';

// 코덱 우선순위: Whisper가 webm/mp4/ogg 모두 지원
function getSupportedMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
}

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript,  setTranscript]  = useState('');
  const [audioBlob,   setAudioBlob]   = useState(null);
  const [error,       setError]       = useState(null);

  const recorderRef = useRef(null);
  const chunksRef   = useRef([]);
  const mimeRef     = useRef('');

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript('');
    setAudioBlob(null);
    chunksRef.current = [];

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('마이크 권한이 필요합니다.');
      return;
    }

    const mime = getSupportedMimeType();
    mimeRef.current = mime;

    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
    recorderRef.current = recorder;

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };

    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
      setAudioBlob(blob);

      if (isTooShort(blob)) { setTranscript(''); return; }

      // Whisper STT — 백그라운드 처리
      try {
        const base64 = await blobToBase64(blob);
        const { transcript: text } = await transcribe({
          audioBase64: base64,
          mimeType: mime || 'audio/webm',
        });
        setTranscript(text);
      } catch(e) {
        console.warn('Whisper STT 오류:', e.message);
        setTranscript('');
      }
    };

    recorder.start(250);
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setIsRecording(false);
  }, []);

  return { isRecording, transcript, audioBlob, startRecording, stopRecording, error };
}
