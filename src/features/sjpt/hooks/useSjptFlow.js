import { useState, useEffect, useCallback } from 'react';
import { requestFeedback } from '../../../services/gpt';

export function useSjptFlow() {
  const [parts,       setParts]       = useState([]);   // [{ part, questions: [{id,text,imageUrl}] }]
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  // 진행 상태
  const [partIdx,     setPartIdx]     = useState(0);    // 0~3
  const [questionIdx, setQuestionIdx] = useState(0);    // 0~1
  const [answers,     setAnswers]     = useState([]);   // [{partNum,question,answer}]

  // GPT 결과
  const [feedback,    setFeedback]    = useState(null);
  const [grading,     setGrading]     = useState(false);
  const [gradingErr,  setGradingErr]  = useState(null);

  // SJPT 문제 로드 (/api/sjpt-questions)
  useEffect(() => {
    fetch('/api/sjpt-questions')
      .then(r => r.json())
      .then(data => {
        if (!data.ok) throw new Error(data?.error?.message || '문제 로드 실패');
        setParts(data.parts);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const currentPart     = parts[partIdx]     || null;
  const currentQuestion = currentPart?.questions?.[questionIdx] || null;
  const totalAnswered   = answers.length;
  const totalQuestions  = parts.reduce((s, p) => s + (p.questions?.length || 0), 0);
  const isDone          = totalAnswered >= totalQuestions;

  // 답변 저장 후 다음 문항으로
  const submitAnswer = useCallback((transcript) => {
    if (!currentQuestion) return;

    const ans = {
      partNum:  currentPart.part,
      question: currentQuestion.text,
      answer:   transcript || '(무응답)',
    };
    setAnswers(prev => [...prev, ans]);

    const nextQIdx = questionIdx + 1;
    if (nextQIdx < (currentPart.questions?.length || 0)) {
      setQuestionIdx(nextQIdx);
    } else {
      const nextPIdx = partIdx + 1;
      if (nextPIdx < parts.length) {
        setPartIdx(nextPIdx);
        setQuestionIdx(0);
      }
      // 마지막 문항이면 isDone이 true가 됨
    }
  }, [currentPart, currentQuestion, partIdx, questionIdx, parts]);

  // 전 문항 완료 후 GPT 채점
  const requestGrading = useCallback(async (level = 'N3') => {
    setGrading(true);
    setGradingErr(null);
    try {
      const result = await requestFeedback({ parts: answers, level });
      setFeedback(result);
    } catch (e) {
      setGradingErr(e.message);
    } finally {
      setGrading(false);
    }
  }, [answers]);

  return {
    parts, loading, error,
    partIdx, questionIdx,
    currentPart, currentQuestion,
    answers, totalAnswered, totalQuestions, isDone,
    submitAnswer,
    feedback, grading, gradingErr, requestGrading,
  };
}
