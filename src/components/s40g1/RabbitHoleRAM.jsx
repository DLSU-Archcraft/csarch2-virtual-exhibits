// src/components/RabbitHoleRAM.jsx
import React from 'react';
import { useCacheStore } from '../../store/s40g1/cacheStore.js';

const memoryImages = {
  'Teacup': '/csarch2-virtual-exhibits/s40g1/Teacup.webp',
  'Knife': '/csarch2-virtual-exhibits/s40g1/Knife.webp',
  'Broken Knife': '/csarch2-virtual-exhibits/s40g1/Broken-Knife.webp',
  'Top Hat': '/csarch2-virtual-exhibits/s40g1/Top-Hat.webp',
  'Broken Top-Hat': '/csarch2-virtual-exhibits/s40g1/Broken-Top-Hat.webp',
  'Clock': '/csarch2-virtual-exhibits/s40g1/Clock.webp',
  'Broken Clock': '/csarch2-virtual-exhibits/s40g1/Broken-Clock.webp',
  'Key': '/csarch2-virtual-exhibits/s40g1/Key.webp',
  'Broken Key': '/csarch2-virtual-exhibits/s40g1/Broken-Key.webp',
  'Broken Mirror': '/csarch2-virtual-exhibits/s40g1/Broken-Mirror.webp',
  'Broken Teacup': '/csarch2-virtual-exhibits/s40g1/Broken-Teacup.webp',
};

const getImageForData = (data) => {
  if (!data) return null;
  return memoryImages[data] || null;
};

const RabbitHoleRAM = () => {
  const { ram, selectedRamAddress, selectRamAddress, handleGlobalWriteback } = useCacheStore();
  const ramAddresses = ['0x00', '0x01', '0x02', '0x03', '0x04'];

  return (
    <div className="ram-container">
      <h3>Rabbit Hole (RAM)</h3>
      <div className="ram-slots">
        {ramAddresses.map((address) => {
          const itemData = ram[address]?.data;
          const imageSrc = getImageForData(itemData);

          return (
            <div 
              key={address} 
              className={`ram-slot ${selectedRamAddress === address ? 'selected' : ''}`}
              onClick={() => selectRamAddress(address)}
              style={{ cursor: 'pointer' }}
            >
              {imageSrc ? (
                <img src={imageSrc} alt={itemData || 'Empty'} className="ram-image" />
              ) : (
                <div className="ram-empty-text">?</div>
              )}
            </div>
          );
        })}
      </div>
      
      <div style={{ marginTop: '20px' }}>
         <button className="btn-writeback" onClick={handleGlobalWriteback}>
            Embrace Sanity
         </button>
      </div>
    </div>
  );
};

export default RabbitHoleRAM;