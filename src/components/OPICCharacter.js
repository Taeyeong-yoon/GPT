import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

const OPICCharacter = () => {
  const container = useRef(null);

  useEffect(() => {
    try {
      if (container.current) {
        const animation = lottie.loadAnimation({
          container: container.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          // 무료 Lottie 애니메이션 URL 사용
          path: 'https://assets10.lottiefiles.com/packages/lf20_jcikwtux.json',
        });

        return () => {
          animation.destroy();
        };
      }
    } catch (error) {
      console.error('Lottie animation error:', error);
    }
  }, []);

  return (
    <div className="character-container">
      <div ref={container} className="lottie-character">
        {/* 로딩 중일 때 보여줄 대체 콘텐츠 */}
        <div className="fallback-content">
          <h3>AI Assistant</h3>
          <p>Loading animation...</p>
        </div>
      </div>
    </div>
  );
};

export default OPICCharacter;
