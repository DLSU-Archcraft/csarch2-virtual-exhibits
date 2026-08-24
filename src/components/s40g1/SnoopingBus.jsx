// src/components/SnoopingBus.jsx
import React from 'react';
import { useCacheStore } from '../../store/s40g1/cacheStore.js';

const SnoopingBus = () => {
  const { isBusActive, busMessage } = useCacheStore();

  return (
    <div className={`snooping-bus ${isBusActive ? 'active' : ''} ${busMessage.type}`}>
      <div className="bus-layout">

        {/* LEFT - Broken Mirror */}
        <div className="bus-mirror">
          <img
            src="/csarch2-virtual-exhibits/s40g1/Broken-Mirror.webp"
            alt="Broken Mirror"
            className="mirror-image"
          />
        </div>

        {/* RIGHT - Action Summary */}
        <div className="bus-summary">
          <h4>Action Summary</h4>

          <div className="bus-status">
            <span className="status-indicator"></span>
            <strong>{busMessage.text}</strong>
          </div>

          <p className="bus-subtext">{busMessage.sub}</p>
        </div>

      </div>
    </div>
  );
};

export default SnoopingBus;