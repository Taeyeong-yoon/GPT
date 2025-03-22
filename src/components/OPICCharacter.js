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
          path: 'https://assets5.lottiefiles.com/packages/lf20_UJNc2t.json'
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
      <div ref={container} style={{ width: 250, height: 250 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          <h3>OPIC Assistant</h3>
          <p>Loading animation...</p>
        </div>
      </div>
    </div>
  );
};

export default OPICCharacter;
