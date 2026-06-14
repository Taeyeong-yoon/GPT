import { useEffect, useRef } from 'react';

// 시험 중 이탈 방지 훅
// active=false 전달 시 (제출 완료 후 등) 가드 해제
export default function useExamGuard(active = true) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!active) {
      if (overlayRef.current?.parentNode) {
        overlayRef.current.parentNode.removeChild(overlayRef.current);
        overlayRef.current = null;
      }
      return;
    }

    // ── 인앱 경고 오버레이 (모바일 뒤로가기·스와이프 백 대응) ──
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;' +
      'background:rgba(0,0,0,0.88);' +
      'display:none;flex-direction:column;' +
      'align-items:center;justify-content:center;' +
      'gap:18px;padding:36px 28px;';
    overlay.innerHTML =
      '<div style="font-size:2.6rem">⚠️</div>' +
      '<p style="color:#fff;font-size:1.12rem;font-weight:900;text-align:center;margin:0">' +
        '시험이 진행 중입니다' +
      '</p>' +
      '<p style="color:rgba(255,255,255,0.75);font-size:0.88rem;text-align:center;margin:0;line-height:1.65">' +
        '지금 나가면 모든 진행 상황이 사라집니다.<br>정말 종료하시겠습니까?' +
      '</p>' +
      '<div style="display:flex;gap:12px;width:100%;max-width:300px;margin-top:4px">' +
        '<button id="eg-cancel" style="flex:1;padding:15px 0;border-radius:14px;' +
          'border:2px solid rgba(255,255,255,0.35);background:transparent;' +
          'color:#fff;font-size:1rem;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent">' +
          '계속하기' +
        '</button>' +
        '<button id="eg-leave" style="flex:1;padding:15px 0;border-radius:14px;' +
          'border:none;background:#E05C8A;color:#fff;font-size:1rem;font-weight:700;' +
          'cursor:pointer;-webkit-tap-highlight-color:transparent">' +
          '나가기' +
        '</button>' +
      '</div>';
    document.body.appendChild(overlay);
    overlayRef.current = overlay;

    const showOverlay = () => { overlay.style.display = 'flex'; };
    const hideOverlay = () => {
      overlay.style.display = 'none';
      window.history.pushState(null, '', window.location.href);
    };
    const leaveExam = () => {
      overlay.style.display = 'none';
      window.removeEventListener('popstate', onPopState);
      window.location.replace('/');
    };

    overlay.querySelector('#eg-cancel').addEventListener('click', hideOverlay);
    overlay.querySelector('#eg-leave').addEventListener('click', leaveExam);

    // ── 1. 새로고침 / 탭 닫기 (데스크탑 유효, 모바일 제한적) ──
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    // ── 2. 뒤로가기 / Android 백 버튼 / iOS 스와이프 백 → 오버레이 표시 ──
    window.history.pushState(null, '', window.location.href);
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
      showOverlay();
    };
    window.addEventListener('popstate', onPopState);

    // ── 3. 모바일 당겨서 새로고침(Pull-to-Refresh) 방지 ──
    document.body.style.overscrollBehavior = 'none';

    // ── 4. iOS Safari 고무줄 스크롤 방지 (맨 위에서 아래로 당길 때) ──
    const onTouchMove = (e) => {
      if (window.scrollY === 0 && e.touches[0]?.clientY > 50) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('touchmove', onTouchMove);
      document.body.style.overscrollBehavior = '';
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      overlayRef.current = null;
    };
  }, [active]);
}
