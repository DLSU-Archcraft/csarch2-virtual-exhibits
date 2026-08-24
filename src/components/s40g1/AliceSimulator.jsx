// src/components/AliceSimulator.jsx
import React from 'react';
import { useCacheStore } from '../../store/s40g1/cacheStore.js';
import SnoopingBus from './SnoopingBus.jsx';
import RabbitHoleRAM from './RabbitHoleRAM.jsx';
import ExplanationPanel from './ExplanationPanel.jsx';
import StatusLog from './StatusLog.jsx';

// Helper to map data to the correct image
export const getImageForData = (data) => {
  if (!data) return null;

  switch (data) {
    case 'Teacup':
      return '/csarch2-virtual-exhibits/s40g1/Teacup.webp';

    case 'Broken Teacup':
      return '/csarch2-virtual-exhibits/s40g1/Broken-Teacup.webp';

    case 'Knife':
      return '/csarch2-virtual-exhibits/s40g1/Knife.webp';

    case 'Broken Knife':
      return '/csarch2-virtual-exhibits/s40g1/Broken-Knife.webp';

    case 'Top Hat':
      return '/csarch2-virtual-exhibits/s40g1/Top-Hat.webp';

    case 'Broken Top-Hat':
      return '/csarch2-virtual-exhibits/s40g1/Broken-Top-Hat.webp';

    case 'Clock':
      return '/csarch2-virtual-exhibits/s40g1/Clock.webp';

    case 'Broken Clock':
      return '/csarch2-virtual-exhibits/s40g1/Broken-Clock.webp';

    case 'Key':
      return '/csarch2-virtual-exhibits/s40g1/Key.webp';

    case 'Broken Key':
      return '/csarch2-virtual-exhibits/s40g1/Broken-Key.webp';

    case 'Broken Mirror':
      return '/csarch2-virtual-exhibits/s40g1/Broken-Mirror.webp';

    default:
      return '/csarch2-virtual-exhibits/s40g1/Broken-Mirror.webp';
  }
};

const AliceSimulator = () => {
  const {
    core0,
    core1,
    selectedCore,
    handleRead,
    handleWrite,
    selectCore,
  } = useCacheStore();

  const getStateClass = (state) => {
    if (state === 'empty') return 'state-empty';
    if (state === 'e') return 'state-e';
    if (state === 's') return 'state-s';
    if (state === 'm') return 'state-m';
    if (state === 'i') return 'state-i';
    return 'state-empty';
  };

  const renderCore = (core, coreId, name, className) => {
    const isSelected = selectedCore === coreId;
    const slot = core.slot;
    const stateClass = getStateClass(slot.state);
    const displayData = slot.data || 'Empty';
    const imageSrc = getImageForData(slot.data);

    return (
      <div className={`${className}`}>
        <h3>{name}</h3>
        <div className="slot-row">
          <div
              className={`memory-slot ${stateClass} ${isSelected ? 'selected' : ''}`}
              onClick={() => selectCore(coreId)}
          >
              <div className="slot-content">
                  {imageSrc && (
                    <img src={imageSrc} alt={displayData} className="memory-image" />
                  )}
                  <div className="memory-label">{displayData}</div>
              </div>
          </div>

          <div className="button-group">
              <button
                  className="btn-remember"
                  onClick={() => handleRead(coreId)}
                  disabled={!isSelected}
              >
                  Remember
              </button>

              <button
                  className="btn-corrupt"
                  onClick={() => handleWrite(coreId)}
                  disabled={!isSelected}
              >
                  Corrupt
              </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="exhibit-container">
      <h1 className="exhibit-title">Alice Through the Snooping Bus</h1>

      <RabbitHoleRAM />
      <div className="split-container">
        {renderCore(core0, 0, 'Classic Alice (Core 0)', 'classic-alice')}
        {renderCore(core1, 1, 'Hysteria Alice (Core 1)', 'hysteria-alice')}
      </div>

      <SnoopingBus />
      <ExplanationPanel />
      <StatusLog />
    </div>
  );
};

export default AliceSimulator;