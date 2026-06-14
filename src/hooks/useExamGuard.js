import { useEffect } from 'react';

// 시험 중 새로고침·뒤로가기 방지 훅
// active=false 를 전달하면 (시험 제출 후 등) 가드를 해제
export default function useExamGuard(active = true) {
  useEffect(() => {
    if (!active) return;

    // 1. 새로고침 / 탭 닫기 경고
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    // 2. 뒤로가기 버튼 차단 — 현재 URL로 히스토리를 하나 더 쌓아두고
    //    popstate 발생 시 다시 앞으로 밀어넣음
    window.history.pushState(null, '', window.location.href);
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', onPopState);

    // 3. 모바일 당겨서 새로고침(Pull-to-Refresh) 방지
    document.body.style.overscrollBehavior = 'none';

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
      document.body.style.overscrollBehavior = '';
    };
  }, [active]);
}
