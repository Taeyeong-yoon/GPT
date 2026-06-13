import React, { useState, useEffect } from 'react';

const PKG = 'com.nekochan.jlpt';
const PLAY_URL = `https://play.google.com/store/apps/details?id=${PKG}`;
const DISMISSED_KEY = 'neko_app_banner_v1';

export default function AppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fromApp   = new URLSearchParams(window.location.search).get('from') === 'app';
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (!fromApp && !dismissed && isAndroid) setVisible(true);
  }, []);

  const handleClose = (e) => {
    e.stopPropagation();
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  const handleClick = () => {
    // market:// → Play Store 앱으로 직접, 없으면 브라우저 Play Store
    const intent = `intent://details?id=${PKG}#Intent;scheme=market;package=com.android.vending;S.browser_fallback_url=${encodeURIComponent(PLAY_URL)};end`;
    window.location.href = intent;
  };

  if (!visible) return null;

  return (
    <div onClick={handleClick} style={{
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
      {/* 앱 아이콘 */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '22px',
      }}>🐱</div>

      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: '14px', lineHeight: 1.3 }}>
          네코짱 앱 다운로드
        </p>
        <p style={{ margin: 0, fontSize: '11px', opacity: 0.8, marginTop: 2 }}>
          Google Play에서 무료로 설치하세요
        </p>
      </div>

      {/* 설치 버튼 */}
      <div style={{
        background: '#fff', color: '#3730A3',
        fontWeight: 800, fontSize: '13px',
        padding: '7px 14px', borderRadius: 20,
        flexShrink: 0, whiteSpace: 'nowrap',
      }}>
        설치
      </div>

      {/* 닫기 */}
      <button onClick={handleClose} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
        fontSize: '18px', padding: '4px', cursor: 'pointer',
        lineHeight: 1, flexShrink: 0,
      }}>✕</button>
    </div>
  );
}
