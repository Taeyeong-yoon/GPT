import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthProvider';
import { db } from '../services/firebase';
import { getSubscriptionStatus } from '../services/subscription';
import {
  checkMiniAccess,
  FREE_JLPT_TOTAL, FREE_SJPT,
  PRO_MONTHLY_JLPT, PRO_MONTHLY_SJPT,
} from '../services/miniUsage';

// checkMiniAccess 반환값 정규화 (canStart 여부에 따라 필드명이 다름)
function getMiniCount(access, isPro) {
  if (!access) return { used: 0, limit: 0 };
  if (isPro) {
    return {
      used:  access.monthUsed  ?? access.used  ?? 0,
      limit: access.monthLimit ?? access.limit ?? PRO_MONTHLY_JLPT,
    };
  }
  return {
    used:  access.lifeUsed  ?? access.used  ?? 0,
    limit: access.lifeLimit ?? access.limit ?? FREE_JLPT_TOTAL,
  };
}

function typeLabel(type, level) {
  if (type === 'jlpt') return `JLPT ${level ?? ''}`.trim();
  if (type === 'sjpt') return 'SJPT';
  return type?.toUpperCase() ?? '';
}

function chipClass(type, level) {
  if (type === 'jlpt' && level) return `chip chip--${level.toLowerCase()}`;
  if (type === 'sjpt') return 'chip chip--sjpt';
  return 'chip chip--n5';
}

function scoreLabel(r) {
  if (r.totalScore != null) return `${r.totalScore}점`;
  if (r.type === 'sjpt') return 'AI 채점 완료';
  return '—';
}

function resultPath(r) {
  if (r.type === 'jlpt') return `/jlpt/result/${r.id}`;
  if (r.type === 'sjpt') return `/sjpt/result/${r.id}`;
  return '/';
}

export default function History() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [results,    setResults]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [miniStats,  setMiniStats]  = useState(null);
  const [isPro,      setIsPro]      = useState(false);
  const [miniLoading, setMiniLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // 정식 시험 기록 로드
    getDocs(query(collection(db, 'users', user.uid, 'results'), orderBy('createdAt', 'desc')))
      .then(snap => setResults(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {})
      .finally(() => setLoading(false));

    // 미니 통계 로드
    getSubscriptionStatus(user.uid)
      .then(async sub => {
        setIsPro(sub.isPro);
        const [jlpt, sjpt] = await Promise.all([
          checkMiniAccess(user.uid, sub.isPro, 'jlpt'),
          checkMiniAccess(user.uid, sub.isPro, 'sjpt'),
        ]);
        setMiniStats({
          jlpt: getMiniCount(jlpt, sub.isPro),
          sjpt: getMiniCount(sjpt, sub.isPro),
        });
      })
      .catch(() => {})
      .finally(() => setMiniLoading(false));
  }, [user]);

  // 정식 시험만 필터 (미니 제외)
  const formalResults = results.filter(r => r.type === 'jlpt' || r.type === 'sjpt');

  return (
    <div className="screen">

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn--ghost" onClick={() => navigate('/')}>←</button>
        <h2 className="screen__title">응시 기록</h2>
      </div>

      {/* ── 미니 테스트 요약 카드 ── */}
      <div className="hist-mini-card">
        <p className="hist-mini-card__heading">📊 미니 테스트</p>
        {miniLoading ? (
          <p className="hist-mini-card__loading">불러오는 중...</p>
        ) : miniStats ? (
          <div className="hist-mini-card__rows">
            <div className="hist-mini-card__row">
              <span className="chip chip--n3" style={{ fontSize: '0.7rem' }}>JLPT 미니</span>
              <span className="hist-mini-card__label">
                {isPro ? '이번 달' : '전체'}
              </span>
              <span className="hist-mini-card__count">
                {miniStats.jlpt.used}
                <span className="hist-mini-card__limit">/ {isPro ? PRO_MONTHLY_JLPT : FREE_JLPT_TOTAL}회</span>
              </span>
            </div>
            <div className="hist-mini-card__row">
              <span className="chip chip--sjpt" style={{ fontSize: '0.7rem' }}>SJPT 미니</span>
              <span className="hist-mini-card__label">
                {isPro ? '이번 달' : '전체'}
              </span>
              <span className="hist-mini-card__count">
                {miniStats.sjpt.used}
                <span className="hist-mini-card__limit">/ {isPro ? PRO_MONTHLY_SJPT : FREE_SJPT}회</span>
              </span>
            </div>
          </div>
        ) : (
          <p className="hist-mini-card__loading">데이터를 불러올 수 없습니다.</p>
        )}
      </div>

      {/* ── 정식 시험 기록 ── */}
      <p className="hist-section-label">📝 정식 시험 기록</p>

      {loading && <p style={{ color: 'var(--on-surface-2)', fontSize: 'var(--fs-sm)' }}>불러오는 중...</p>}

      {!loading && formalResults.length === 0 && (
        <div style={{ textAlign: 'center', padding: 'var(--sp-8) 0' }}>
          <p style={{ marginBottom: 16, color: 'var(--on-surface-2)' }}>아직 정식 응시 기록이 없어요.</p>
          <button className="btn btn--primary" onClick={() => navigate('/jlpt')}>JLPT 시작</button>
        </div>
      )}

      <div className="stack gap-3">
        {formalResults.map(r => (
          <div
            key={r.id}
            className="card hist-result-row"
            onClick={() => navigate(resultPath(r), { state: r })}
          >
            <span className={chipClass(r.type, r.level)}>
              {typeLabel(r.type, r.level)}
            </span>
            <span className="hist-result-row__score">{scoreLabel(r)}</span>
            <span className="hist-result-row__date">
              {r.createdAt?.toDate?.().toLocaleDateString('ko-KR') ?? ''}
            </span>
            <span className="hist-result-row__arrow">›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
