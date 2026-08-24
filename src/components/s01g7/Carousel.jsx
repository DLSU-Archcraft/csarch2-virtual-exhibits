import { useState, useEffect } from 'react';

const ICONS = {
  punch: `<svg viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="54" height="38" rx="2" fill="#c8b84a" stroke="#9a8828" stroke-width="1"/><rect x="49" y="1" width="6" height="7" rx="1" fill="#9a8828"/><rect x="5" y="8" width="4" height="4" rx="1" fill="#3a2800"/><rect x="12" y="8" width="4" height="4" rx="1" fill="#3a2800"/><rect x="26" y="8" width="4" height="4" rx="1" fill="#3a2800"/><rect x="40" y="8" width="4" height="4" rx="1" fill="#3a2800"/><rect x="5" y="16" width="4" height="4" rx="1" fill="#3a2800"/><rect x="19" y="16" width="4" height="4" rx="1" fill="#3a2800"/><rect x="33" y="16" width="4" height="4" rx="1" fill="#3a2800"/><rect x="47" y="16" width="4" height="4" rx="1" fill="#3a2800"/><rect x="12" y="24" width="4" height="4" rx="1" fill="#3a2800"/><rect x="26" y="24" width="4" height="4" rx="1" fill="#3a2800"/><rect x="40" y="24" width="4" height="4" rx="1" fill="#3a2800"/><rect x="5" y="32" width="4" height="4" rx="1" fill="#3a2800"/><rect x="19" y="32" width="4" height="4" rx="1" fill="#3a2800"/><rect x="33" y="32" width="4" height="4" rx="1" fill="#3a2800"/></svg>`,
  hdd: `<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="30" r="27" fill="#1e1e2e" stroke="#555" stroke-width="1.5"/><circle cx="30" cy="30" r="22" fill="none" stroke="#383848" stroke-width="0.8"/><circle cx="30" cy="30" r="16" fill="none" stroke="#303040" stroke-width="0.8"/><circle cx="30" cy="30" r="10" fill="none" stroke="#282838" stroke-width="0.8"/><circle cx="30" cy="30" r="4" fill="#777" stroke="#aaa" stroke-width="1.2"/><line x1="30" y1="30" x2="52" y2="10" stroke="#39FF14" stroke-width="2" stroke-linecap="round"/><circle cx="52" cy="10" r="3.5" fill="#39FF14" opacity="0.9"/></svg>`,
  optical: `<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="cdGrad" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="20%" stop-color="#ffb0b0"/><stop offset="40%" stop-color="#ffffaa"/><stop offset="60%" stop-color="#aaffcc"/><stop offset="80%" stop-color="#aaaaff"/><stop offset="100%" stop-color="#cc88ff"/></radialGradient></defs><circle cx="30" cy="30" r="28" fill="url(#cdGrad)" stroke="#bbb" stroke-width="0.5" opacity="0.95"/><circle cx="30" cy="30" r="6" fill="#e8e8e8" stroke="#ccc" stroke-width="1"/><circle cx="30" cy="30" r="2.5" fill="#ccc"/></svg>`,
  flash: `<svg viewBox="0 0 60 42" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="6" width="56" height="30" rx="4" fill="#0e1a0e" stroke="#39FF14" stroke-width="1"/><rect x="8" y="11" width="44" height="20" rx="2" fill="#081008" stroke="#1a3a1a" stroke-width="0.5"/><rect x="11" y="13" width="12" height="7" rx="1" fill="#143214" stroke="#39FF14" stroke-width="0.5"/><rect x="26" y="13" width="12" height="7" rx="1" fill="#143214" stroke="#39FF14" stroke-width="0.5"/><rect x="11" y="23" width="12" height="7" rx="1" fill="#143214" stroke="#39FF14" stroke-width="0.5"/><rect x="26" y="23" width="12" height="7" rx="1" fill="#143214" stroke="#39FF14" stroke-width="0.5"/><rect x="41" y="13" width="7" height="17" rx="1" fill="#20104a" stroke="#8000FF" stroke-width="0.5"/><rect x="8" y="35" width="4" height="3" rx="0.5" fill="#aaa"/><rect x="14" y="35" width="4" height="3" rx="0.5" fill="#aaa"/><rect x="20" y="35" width="4" height="3" rx="0.5" fill="#aaa"/><rect x="26" y="35" width="4" height="3" rx="0.5" fill="#aaa"/><rect x="32" y="35" width="4" height="3" rx="0.5" fill="#aaa"/></svg>`,
  horizon: `<svg viewBox="0 0 60 56" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="30" cy="38" rx="22" ry="11" fill="#12003a" stroke="#8000FF" stroke-width="1.5"/><circle cx="22" cy="33" r="10" fill="#12003a" stroke="#8000FF" stroke-width="1.5"/><circle cx="38" cy="31" r="9" fill="#12003a" stroke="#8000FF" stroke-width="1.5"/><circle cx="30" cy="26" r="12" fill="#12003a" stroke="#8000FF" stroke-width="1.5"/><path d="M 22 44 Q 26 41 30 44 Q 34 47 38 44" stroke="#FF00FF" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M 22 48 Q 26 45 30 48 Q 34 51 38 48" stroke="#00FFFF" stroke-width="1.2" fill="none" stroke-linecap="round"/><circle cx="22" cy="44" r="1.5" fill="#FF00FF"/><circle cx="38" cy="44" r="1.5" fill="#FF00FF"/><circle cx="22" cy="48" r="1.5" fill="#00FFFF"/><circle cx="38" cy="48" r="1.5" fill="#00FFFF"/></svg>`,
};

export default function Carousel({ baseUrl = '/' }) {
  const exhibits = [
    { icon: ICONS.punch, label: 'Punch Card', title: 'THE ORIGIN:', sub: 'Punch Cards and Magnetic Drums', href: '/csarch2-virtual-exhibits/s01g7/origin' },
    { icon: ICONS.hdd, label: 'HDD', title: 'THE DISK:', sub: 'Magnetic Storage and HDDs', href: '/csarch2-virtual-exhibits/s01g7/disk' },
    { icon: ICONS.optical, label: 'Optical', title: 'THE OPTICAL AGE:', sub: 'CDs, DVDs, and Their Limits', href: '/csarch2-virtual-exhibits/s01g7/optical' },
    { icon: ICONS.flash, label: 'SSD / NVMe', title: 'THE FLASH:', sub: 'SSDs, NAND, and NVMe', href: '/csarch2-virtual-exhibits/s01g7/flash' },
    { icon: ICONS.horizon, label: 'Cloud / DNA', title: 'THE HORIZON:', sub: 'Cloud, DNA, and Emerging Storage', href: '/csarch2-virtual-exhibits/s01g7/horizon' },
  ];

  const [activeIndex, setActiveIndex] = useState(2);
  const [paused, setPaused] = useState(false);
  const total = exhibits.length;
  const active = exhibits[activeIndex];

  const goPrev = () => setActiveIndex((i) => (i - 1 + total) % total);
  const goNext = () => setActiveIndex((i) => (i + 1) % total);

  // auto-advance so the carousel feels alive; pauses while the user is
  // interacting with it, and stays still for reduced-motion visitors
  useEffect(() => {
    if (paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setActiveIndex((i) => (i + 1) % total), 3500);
    return () => clearInterval(id);
  }, [paused, total]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
  };

  return (
    <section
      className="carousel-section"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <p className="carousel-hint">Select a storage medium to explore</p>

      <div className="carousel-nav-wrap">
        <button className="carousel-nav" aria-label="Previous exhibit" onClick={goPrev}>&#10094;</button>
        <div className="carousel" role="listbox" aria-label="Storage media" tabIndex={0} onKeyDown={onKeyDown}>
          {exhibits.map((ex, idx) => (
            <div
              key={ex.title}
              role="option"
              aria-selected={idx === activeIndex}
              className={`carousel-item${idx === activeIndex ? ' active' : ''}`}
              onClick={() => setActiveIndex(idx)}
            >
              <div className="carousel-icon" dangerouslySetInnerHTML={{ __html: ex.icon }} />
              <span>{ex.label}</span>
            </div>
          ))}
        </div>
        <button className="carousel-nav" aria-label="Next exhibit" onClick={goNext}>&#10095;</button>
      </div>

      {/* details live in a stable panel below the row, so selecting never
          shoves the icons around — it just cross-fades this card */}
      <div className="carousel-detail" key={activeIndex}>
        <h3 className="carousel-detail-title">{active.title}</h3>
        <p className="carousel-detail-sub">{active.sub}</p>
        <a href={active.href} className="btn btn-primary carousel-detail-btn">
          Explore {active.label} &rarr;
        </a>
      </div>

      <div className="carousel-dots">
        {exhibits.map((ex, idx) => (
          <button
            key={ex.title}
            className={`carousel-dot${idx === activeIndex ? ' active' : ''}`}
            aria-label={`Go to ${ex.label}`}
            onClick={() => setActiveIndex(idx)}
          />
        ))}
      </div>
    </section>
  );
}
