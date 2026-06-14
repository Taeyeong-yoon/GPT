import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import nekoStar from '../assets/neko-cats/neko-cat-12-star-eyes.png';
import { IS_ANDROID } from '../utils/fromApp';

const PKG = 'com.nekochan.jlpt';
const PLAY_URL = `https://play.google.com/store/apps/details?id=${PKG}`;
const DISMISSED_KEY = 'neko_app_banner_v1';
const DISMISS_DAYS = 7;

export function openPlayStore() {
  const intent = `intent://details?id=${PKG}#Intent;scheme=market;package=com.android.vending;S.browser_fallback_url=${encodeURIComponent(PLAY_URL)};end`;
  window.location.href = intent;
}

function detectFromApp(search) {
  if (new URLSearchParams(search).get('from') === 'app') {
    sessionStorage.setItem('neko_from_app', '1');
    return true;
  }
  return sessionStorage.getItem('neko_from_app') === '1';
}

const BANNER_STYLE = {
  position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
  width: '100%', maxWidth: '480px',
  display: 'flex', alignItems: 'center', gap: '12px',
  padding: '12px 16px',
  cursor: 'pointer',
  zIndex: 9999,
  boxSizing: 'border-box',
};

export default function AppBanner() {
  const location = useLocation();

  // fromApp is reactive: re-evaluated whenever the URL changes
  const [fromApp, setFromApp] = useState(() => detectFromApp(window.location.search));
  const [downloadVisible, setDownloadVisible] = useState(false);

  // Pick up ?from=app if Flutter sets it after initial load or navigates with it
  useEffect(() => {
    const detected = detectFromApp(location.search);
    if (detected && !fromApp) setFromApp(true);
  }, [location.search]);

  // Flutter can call window.setNekoFromApp() at any time after WebView loads
  useEffect(() => {
    const handler = () => setFromApp(true);
    window.addEventListener('neko_from_app', handler);
    return () => window.removeEventListener('neko_from_app', handler);
  }, []);

  // Download banner: only for Android non-app users
  useEffect(() => {
    if (fromApp || !IS_ANDROID) return;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) {
      const daysAgo = (Date.now() - Number(dismissed)) / 86400000;
      if (daysAgo < DISMISS_DAYS) return;
      localStorage.removeItem(DISMISSED_KEY);
    }
    setDownloadVisible(true);
  }, [fromApp]);

  // 앱에서 접근 시 JLPT/SJPT 관련 페이지에서는 배너 숨김
  const isExam = /\/(jlpt|sjpt)/.test(location.pathname);

  // cta-bar가 있는 화면에서 banner가 버튼을 가리지 않도록 body class 추가
  useEffect(() => {
    if (fromApp && !isExam) {
      document.body.classList.add('has-app-banner');
    } else {
      document.body.classList.remove('has-app-banner');
    }
    return () => document.body.classList.remove('has-app-banner');
  }, [fromApp, isExam]);

  // ── fromApp 모드: 앱으로 이동 버튼 ──────────────────────────────
  if (fromApp && !isExam) {
    return (
      <div
        onClick={() => window.close()}
        style={{
          ...BANNER_STYLE,
          background: 'linear-gradient(135deg, #1E3A5F, #2563EB)',
          color: '#fff',
          boxShadow: '0 -4px 20px rgba(30,58,95,0.35)',
        }}
      >
        <img src={nekoStar} alt="네코짱" style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0, objectFit: 'contain',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '14px', lineHeight: 1.3 }}>
            네코짱 앱으로 이동
          </p>
          <p style={{ margin: 0, fontSize: '11px', opacity: 0.8, marginTop: 2 }}>
            탭하면 앱으로 돌아갑니다
          </p>
        </div>
        <div style={{
          background: '#fff', color: '#1E3A5F',
          fontWeight: 800, fontSize: '13px',
          padding: '7px 14px', borderRadius: 20,
          flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          앱으로 →
        </div>
      </div>
    );
  }

  // ── 일반 모드: 앱 설치 배너 ────────────────────────────────────
  if (!downloadVisible) return null;

  const handleClose = (e) => {
    e.stopPropagation();
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setDownloadVisible(false);
  };

  return (
    <div onClick={openPlayStore} style={{
      ...BANNER_STYLE,
      background: 'linear-gradient(135deg, #3730A3, #4F46E5)',
      color: '#fff',
      boxShadow: '0 -4px 20px rgba(55,48,163,0.35)',
    }}>
      <img src={nekoStar} alt="네코짱" style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0, objectFit: 'contain',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: '14px', lineHeight: 1.3 }}>
          네코짱 앱 다운로드
        </p>
        <p style={{ margin: 0, fontSize: '11px', opacity: 0.8, marginTop: 2 }}>
          Google Play에서 무료로 설치하세요
        </p>
      </div>
      <div style={{
        background: '#fff', color: '#3730A3',
        fontWeight: 800, fontSize: '13px',
        padding: '7px 14px', borderRadius: 20,
        flexShrink: 0, whiteSpace: 'nowrap',
      }}>
        설치
      </div>
      <button onClick={handleClose} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
        fontSize: '18px', padding: '4px', cursor: 'pointer',
        lineHeight: 1, flexShrink: 0,
      }}>✕</button>
    </div>
  );
}
