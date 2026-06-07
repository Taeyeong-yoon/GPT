import { useState, useRef, useCallback } from 'react';
import { blobToBase64, isTooShort } from '../../../utils/audioUtils';
import { transcribe } from '../../../services/stt';

// 코덱 우선순위: Chrome/Firefox → Safari 폴백
function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
}

function mimeToEncoding(mimeType) {
  if (mimeType.includes('mp4'))  return { encoding: 'MP3',       sampleRateHertz: 44100 };
  if (mimeType.includes('ogg'))  return { encoding: 'OGG_OPUS',  sampleRateHertz: 48000 };
  return                                { encoding: 'WEBM_OPUS', sampleRateHertz: 48000 };
}

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript,  setTranscript]  = useState('');
  const [audioBlob,   setAudioBlob]   = useState(null);
  const [error,       setError]       = useState(null);

  const recorderRef  = useRef(null);
  const chunksRef    = useRef([]);
  const mimeTypeRef  = useRef('');

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript('');
    setAudioBlob(null);
    chunksRef.current = [];

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setError('마이크 권한이 필요합니다. 브라우저 설정에서 허용해주세요.');
      return;
    }

    const mimeType = getSupportedMimeType();
    mimeTypeRef.current = mimeType;

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
      setAudioBlob(blob);

      // 너무 짧으면 STT 스킵
      if (isTooShort(blob)) {
        setTranscript('');
        return;
      }

      // 백그라운드 STT — UI 블로킹 없음
      try {
        const base64 = await blobToBase64(blob);
        const enc    = mimeToEncoding(mimeType);
        const { transcript: text } = await transcribe({ audioBase64: base64, ...enc });
        setTranscript(text);
      } catch {
        setTranscript('');
      }
    };

    recorder.start(250); // 250ms 청크
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  return { isRecording, transcript, audioBlob, startRecording, stopRecording, error };
}
