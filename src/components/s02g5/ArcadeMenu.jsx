import React from 'react';
import styles from './ArcadeMenu.module.css';

const eras = [
  { id: '1970s', title: 'Arcade & TTL Logic', color: '#FF8C00', tech: 'Discrete Logic Circuits', game: 'Pong (1972)' },
  { id: '1980s', title: 'Home 8-Bit Consoles', color: '#E60012', tech: 'CPU + PPU Architecture', game: 'Super Mario Bros.' },
  { id: '1990s', title: '16-Bit & 3D Polygons', color: '#00E6C3', tech: 'Geometry Engine & CD-ROM', game: 'Super Mario 64' },
  { id: '2000s', title: 'Online & 6th Gen', color: '#39FF14', tech: 'Programmable Shaders & Xbox Live', game: 'Halo 2' },
  { id: '2010s', title: 'Mobile, Indie & PBR', color: '#00C3FF', tech: 'x86 Architecture & UMA', game: 'The Witcher 3' },
  { id: '2020s', title: 'Next-Gen & AI Ray Tracing', color: '#D400FF', tech: 'NVMe Direct I/O & RT Cores', game: 'Cyberpunk 2077' }
];

export default function ArcadeMenu() {
  // Astro dynamically supplies the base URL ('/csarch2-virtual-exhibits/s02g5/' or '/')
  const rawBase = import.meta.env.BASE_URL || '/';
  const baseUrl = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

  return (
    <div className={styles.cabinetGrid}>
      {eras.map((era) => (
        <a 
          href={`${baseUrl}s02g5/${era.id}/`}
          key={era.id} 
          className={styles.cabinetCard}
          style={{ '--cabinet-color': era.color }}
        >
          <div className={styles.marquee}>{era.id}</div>
          <div className={styles.screen}>
            <span className={styles.screenGlow} />
            <h3 className={styles.eraHeading}>{era.title}</h3>
            <p className={styles.techSpec}><strong>Core:</strong> {era.tech}</p>
            <p className={styles.popGame}><strong>Key Title:</strong> {era.game}</p>
          </div>
          <div className={styles.controlPanel}>
            <span className={styles.coinSlot}>INSERT ERA ➔</span>
          </div>
        </a>
      ))}
    </div>
  );
}