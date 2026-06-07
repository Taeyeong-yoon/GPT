import { useState, useEffect, useCallback } from 'react';

// 섹션별 추출 목표 문항 수
const SECTION_TARGETS = {
  vocabulary: 12,
  grammar:    12,
  reading:    8,
  listening:  8,
};

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 레벨별 JSON 동적 로드 + 섹션별 랜덤 추출
 * @param {string} level - 'N5'~'N1'
 */
export function useJlptQuestions(level) {
  const [examSet, setExamSet] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    if (!level) return;
    setLoading(true);
    setError(null);

    try {
      // 동적 import — 빌드 시 분리된 청크로 로드
      const data = await import(`../../data/jlpt/${level.toLowerCase()}.json`);
      const sections = data.sections || data.default?.sections;

      if (!sections) throw new Error('문제 데이터를 찾을 수 없습니다.');

      const selected = [];
      for (const [sec, target] of Object.entries(SECTION_TARGETS)) {
        const pool = sections[sec] || [];
        const picked = shuffled(pool).slice(0, target);
        if (picked.length < target) {
          console.warn(`[JLPT] ${level} ${sec}: ${picked.length}/${target}문항 (부족)`);
        }
        selected.push(...picked);
      }

      setExamSet(selected);
    } catch (e) {
      setError(e.message || '문제 로드 실패');
    } finally {
      setLoading(false);
    }
  }, [level]);

  useEffect(() => { load(); }, [load]);

  return { examSet, loading, error, reload: load };
}
