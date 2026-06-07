/**
 * JLPT 채점 유틸
 * 실제 JLPT 합격 기준(총점 + 과목별 과락) 적용
 */

// 실제 JLPT 합격 기준 (총점/180, 과목별 최소)
const PASS_CRITERIA = {
  N5: { total: 80,  vocab: 38, reading: 19, listening: 19 },
  N4: { total: 90,  vocab: 38, reading: 19, listening: 19 },
  N3: { total: 95,  vocab: 19, reading: 19, listening: 19 },
  N2: { total: 90,  vocab: 19, reading: 19, listening: 19 },
  N1: { total: 100, vocab: 19, reading: 19, listening: 19 },
};

// 섹션별 배점 (180점 만점)
const SECTION_WEIGHTS = {
  N5: { vocabulary: 60, grammar: 60, reading: 30, listening: 30 },
  N4: { vocabulary: 60, grammar: 60, reading: 30, listening: 30 },
  N3: { vocabulary: 30, grammar: 30, reading: 60, listening: 60 },
  N2: { vocabulary: 30, grammar: 30, reading: 60, listening: 60 },
  N1: { vocabulary: 30, grammar: 30, reading: 60, listening: 60 },
};

/**
 * @param {Object} params
 * @param {Array}  params.examSet   - 문항 배열 [{id, section, correctIndex, ...}]
 * @param {Object} params.answers   - { [questionId]: selectedIndex }
 * @param {string} params.level     - 'N5'~'N1'
 * @returns {Object} 채점 결과
 */
export function scoreJlpt({ examSet, answers, level }) {
  const weights = SECTION_WEIGHTS[level] || SECTION_WEIGHTS.N5;
  const criteria = PASS_CRITERIA[level] || PASS_CRITERIA.N5;

  const sectionCorrect = { vocabulary: 0, grammar: 0, reading: 0, listening: 0 };
  const sectionTotal   = { vocabulary: 0, grammar: 0, reading: 0, listening: 0 };
  const wrongItems = [];

  for (const item of examSet) {
    const sec = item.section;
    if (!(sec in sectionTotal)) continue;

    sectionTotal[sec]++;
    const selected = answers[item.id];
    const correct  = selected === item.correctIndex;

    if (correct) {
      sectionCorrect[sec]++;
    } else {
      wrongItems.push({
        id:          item.id,
        question:    item.question,
        selected:    selected ?? null,
        correct:     item.correctIndex,
        explanation: item.explanation,
        section:     sec,
      });
    }
  }

  // 섹션별 180점 환산
  const sectionScores = {};
  let totalScore = 0;
  for (const sec of Object.keys(weights)) {
    const w    = weights[sec];
    const cnt  = sectionTotal[sec] || 1;
    const pts  = Math.round((sectionCorrect[sec] / cnt) * w);
    sectionScores[sec] = pts;
    totalScore += pts;
  }

  // 합격 판정
  const vocabScore     = sectionScores.vocabulary + sectionScores.grammar;
  const readingScore   = sectionScores.reading;
  const listeningScore = sectionScores.listening;

  const passed =
    totalScore     >= criteria.total    &&
    vocabScore     >= criteria.vocab    &&
    readingScore   >= criteria.reading  &&
    listeningScore >= criteria.listening;

  return {
    totalScore,
    maxScore: 180,
    passStatus: passed ? 'pass' : 'fail',
    criteria,
    sectionScores,
    sectionCorrect,
    sectionTotal,
    wrongItems,
  };
}
