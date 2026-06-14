import { useState, useEffect, useCallback } from 'react';

export function useSjptMiniFlow() {
  const [parts,       setParts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [partIdx,     setPartIdx]     = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers,     setAnswers]     = useState([]);

  useEffect(() => {
    fetch(`/api/sjpt-questions?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        if (!data.ok) throw new Error(data?.error?.message || '문제 로드 실패');
        // 1부: 전체, 2~7부: 각 1문항
        const mini = data.parts.map(p => ({
          ...p,
          questions: p.part === 1 ? p.questions : p.questions.slice(0, 1),
        }));
        setParts(mini);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const currentPart     = parts[partIdx]     || null;
  const currentQuestion = currentPart?.questions?.[questionIdx] || null;
  const totalAnswered   = answers.length;
  const totalQuestions  = parts.reduce((s, p) => s + (p.questions?.length || 0), 0);
  const isDone          = totalQuestions > 0 && totalAnswered >= totalQuestions;

  const submitAnswer = useCallback((transcript) => {
    if (!currentQuestion) return;
    setAnswers(prev => [...prev, {
      partNum:  currentPart.part,
      question: currentQuestion.text,
      answer:   transcript || '(무응답)',
      ...(currentQuestion.theme    && { theme:    currentQuestion.theme }),
      ...(currentQuestion.keywords && { keywords: currentQuestion.keywords }),
    }]);

    const nextQIdx = questionIdx + 1;
    if (nextQIdx < (currentPart.questions?.length || 0)) {
      setQuestionIdx(nextQIdx);
    } else {
      const nextPIdx = partIdx + 1;
      if (nextPIdx < parts.length) { setPartIdx(nextPIdx); setQuestionIdx(0); }
    }
  }, [currentPart, currentQuestion, partIdx, questionIdx, parts]);

  return {
    parts, loading, error,
    partIdx, questionIdx,
    currentPart, currentQuestion,
    answers, totalAnswered, totalQuestions, isDone,
    submitAnswer,
  };
}
