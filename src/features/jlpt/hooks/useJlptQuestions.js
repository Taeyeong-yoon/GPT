import { useState, useEffect, useCallback } from 'react';
import n5 from '../../../data/jlpt/n5.json';
import n4 from '../../../data/jlpt/n4.json';
import n3 from '../../../data/jlpt/n3.json';
import n2 from '../../../data/jlpt/n2.json';
import n1 from '../../../data/jlpt/n1.json';

const DATA = { N5: n5, N4: n4, N3: n3, N2: n2, N1: n1 };

const TARGETS = { vocabulary:12, grammar:12, reading:8, listening:8 };

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

export function useJlptQuestions(level) {
  const [examSet, setExamSet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const data = DATA[level];
      if (!data) throw new Error(`레벨 ${level} 데이터 없음`);
      const sections = data.sections;
      const selected = [];
      for (const [sec, target] of Object.entries(TARGETS)) {
        const pool   = sections[sec] || [];
        const picked = shuffled(pool).slice(0, target);
        if (picked.length < target)
          console.warn(`[JLPT] ${level} ${sec}: ${picked.length}/${target} (부족)`);
        selected.push(...picked);
      }
      setExamSet(selected);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [level]);

  useEffect(() => { load(); }, [load]);

  return { examSet, loading, error, reload: load };
}
