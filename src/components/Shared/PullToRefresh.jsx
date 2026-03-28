import React, { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

export default function PullToRefresh({ children, onRefresh, disabled = false }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    if (disabled || refreshing) return;
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (disabled || refreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0 && containerRef.current.scrollTop === 0) {
      setPulling(true);
    }
  };

  const handleTouchEnd = async (e) => {
    if (!pulling || disabled || refreshing) return;

    const currentY = e.changedTouches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 120) { // threshold
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPulling(false);
      }
    } else {
      setPulling(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="pull-to-refresh-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative', overflowY: 'auto', height: '100%' }}
    >
      {/* Pull indicator */}
      <div
        className={`pull-indicator ${pulling ? 'pulling' : ''} ${refreshing ? 'refreshing' : ''}`}
        style={{
          position: 'absolute',
          top: -50,
          left: 0,
          right: 0,
          height: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.3s ease',
          transform: pulling || refreshing ? 'translateY(70px)' : 'translateY(0)',
          zIndex: 20,
        }}
      >
        <RefreshCw
          size={24}
          className={refreshing ? 'animate-spin' : ''}
          style={{ color: '#7c3aed' }}
        />
      </div>

      {children}
    </div>
  );
}
