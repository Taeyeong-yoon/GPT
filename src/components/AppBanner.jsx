import React, { useState, useEffect } from 'react';
import nekoStar from '../assets/neko-cats/neko-cat-12-star-eyes.png';

const PKG = 'com.nekochan.jlpt';
const PLAY_URL = `https://play.google.com/store/apps/details?id=${PKG}`;
const DISMISSED_KEY = 'neko_app_banner_v1';
const DISMISS_DAYS = 7;

export function openPlayStore() {
  const intent = `intent://details?id=${PKG}#Intent;scheme=market;package=com.android.vending;S.browser_fallback_url=${encodeURIComponent(PLAY_URL)};end`;
  window.location.href = intent;
}

export default function AppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fromApp   = new URLSearchParams(window.location.search).get('from') === 'app';
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (fromApp || !isAndroid) return;

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) {
      const daysAgo = (Date.now() - Number(dismissed)) / 86400000;
      if (daysAgo < DISMISS_DAYS) return;
      localStorage.removeItem(DISMISSED_KEY);
    }
    setVisible(true);
  }, []);

  const handleClose = (e) => {
    e.stopPropagation();
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div onClick={openPlayStore} style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: '480px',
      background: 'linear-gradient(135deg, #3730A3, #4F46E5)',
      color: '#fff',
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 16px',
      boxShadow: '0 -4px 20px rgba(55,48,163,0.35)',
      cursor: 'pointer',
      zIndex: 9999,
      boxSizing: 'border-box',
    }}>
      <img src={nekoStar} alt="네코짱" style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        objectFit: 'contain',
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
