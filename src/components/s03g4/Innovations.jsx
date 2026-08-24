import { useState, useRef, useEffect } from 'react';
import '../../styles/s03g4/Innovations.css';

import spaceBg from '../../assets/s03g4/innovations-bg.webp';
import i1T from '../../assets/s03g4/innovation-1-then.webp';
import i1N from '../../assets/s03g4/innovation-1-now.jpg';
import i2T from '../../assets/s03g4/innovation-2-then.webp';
import i2N from '../../assets/s03g4/innovation-2-now.webp';
import i3T from '../../assets/s03g4/innovation-3-then.webp';
import i3N from '../../assets/s03g4/innovation-3-now.webp';
import i4T from '../../assets/s03g4/innovation-4-then.webp';
import i4N from '../../assets/s03g4/innovation-4-now.webp';
import i5T from '../../assets/s03g4/innovation-5-then.webp';
import i5N from '../../assets/s03g4/innovation-5-now.webp';
 
const innovations = [
  {
    name: "Circuits and Microchips",
    then: "The AGC was one of the first computers to rely on integrated circuits, packing multiple electronic components onto a single small chip. This was a major step toward the miniaturization of electronics, and the huge production demand for the Apollo program guaranteed an early market that fueled further chip development.",
    now: "Today's smartphone and computer processors trace their lineage directly back to this leap in miniaturization, with modern CPUs found in everything from phones to supercomputers descending from this technology. What once filled a spacecraft's guidance bay now fits on a fingertip-sized chip.",
    thenImg: i1T,
    nowImg: i1N
  },
  {
    name: "Fly-by-Wire Flight Control",
    then: "The Apollo program's digital fly-by-wire technology, which replaced manual systems with a computer, is now used in modern-day aircraft, making them safer and more efficient. This same \"let the computer assist the pilot\" concept underpins today's commercial airliners and even modern car driver-assist systems",
    now: "That same fly-by-wire concept is now standard in modern aircraft, making them safer and more fuel-efficient than manually-controlled predecessors. It also underpins today's driver-assist and stability-control systems in cars, where a computer intervenes between human input and physical movement.",
    thenImg: i2T,
    nowImg: i2N
  },
  {
    name: "Operating and Embedded Systems",
    then: "The AGC had to run navigation, guidance, and crew-interface tasks simultaneously on a machine with a tiny fraction of the memory of a modern calculator. To fit within the computer's limited memory, programmers had to design efficient, impeccably organized code, and pioneering methods like parallel processing and multi-tasking were used to maximize efficiency. It's been described as the first digital general-purpose, multitasking, interactive portable computer.",
    now: "That multitasking, real-time architecture is the direct ancestor of embedded systems running quietly inside cars, appliances, industrial controllers, and medical devices where small processors are juggling multiple jobs at once, invisibly, the way the AGC juggled guidance math and astronaut commands in 1969",
    thenImg: i3T,
    nowImg: i3N
  },
  {
    name: "Reliability-First Systems Engineering",
    then: "Software wasn't yet treated as a serious engineering discipline, that was until Apollo forced the issue. Margaret Hamilton led the team that wrote the AGC code, and their work establishing structured programming principles and rigorous testing methods essentially gave birth to the discipline of software engineering. That philosophy was tested for real during the Apollo 11 landing itself, when the computer began throwing overload alarms with the astronauts minutes from touchdown — and kept working anyway because a restart function built into the code let the astronauts continue flying instead of aborting the mission",
    now: "That same philosophy, expecting failure and designing systems to survive it rather than assuming perfection, is what Hamilton and her team proved was possible when Apollo 11's computer overloaded during the actual lunar landing and kept running instead of failing outright. The \"essentially gave birth to the discipline of software engineering\" framing reflects how significant that moment was seen to be, discipline whose core principles, rigorous testing and structured programming, remain foundational to how software is built when failure isn't an option.",
    thenImg: i4T,
    nowImg: i4N
  },
  {
    name: "Reflective Insulation",
    then: "NASA needed insulation for Apollo-era spacesuits that could handle the extreme temperature swings of space, one far beyond what existing materials could manage. NASA found that by layering multiple metalized sheets of lightweight mylar, it could create a reflective insulation far more effective, both pound-for-pound and inch-for-inch, than anything else available. NASA went on to master the technology, improving its strength, fabrication techniques, and testing procedures.",
    now: "This insulation has been used in just about every NASA spacecraft and spacesuit since its creation. The blankets you see in emergency kits and handed out at the end of marathons are the most visible everyday example, but the same technology is used far more often in less visible applications: clothing, firefighting and camping gear, building insulation, cryogenic storage, MRI machines, and particle colliders.",
    thenImg: i5T,
    nowImg: i5N
  }
];

function CompareSlider({ thenImg, nowImg, name }) {
  const [pos, setPos] = useState(50);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  const measure = () => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.getBoundingClientRect().width);
    }
  };

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const updatePos = (clientX) => {
    const rect = containerRef.current.getBoundingClientRect();
    let percent = ((clientX - rect.left) / rect.width) * 100;
    percent = Math.min(100, Math.max(0, percent));
    setPos(percent);
  };

  const handleMouseDown = () => { dragging.current = true; };
  const handleMouseUp = () => { dragging.current = false; };

  const handleMouseMove = (e) => {
    if (dragging.current) updatePos(e.clientX);
  };

  const handleTouchMove = (e) => {
    if (e.touches && e.touches[0]) updatePos(e.touches[0].clientX);
  };

  return (
    <div
      className="compare-slider"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      onTouchMove={handleTouchMove}
    >
                                                                                      
    
      <div className="compare-slider__now-layer">

        <img
          className="compare-slider__bg"
          src={nowImg.src}
          alt=""
          aria-hidden="true"
          draggable="false"
        />

        <img
          className="compare-slider__img compare-slider__now"
          src={nowImg.src}
          alt={`${name} — today`}
          draggable="false"
        />

      </div>
 
      <div className="compare-slider__then-wrap" style={{ width: `${pos}%` }}>

        <div className="compare-slider__then-layer" style={{ width: `${containerWidth}px` }}>

          <img
            className="compare-slider__bg"
            src={thenImg.src}
            alt=""
            aria-hidden="true"
            draggable="false"
          />

          <img
            className="compare-slider__img compare-slider__then"
            src={thenImg.src}
            alt={`${name} — 1960s`}
            draggable="false"
          />

        </div>

      </div>

      <div className="compare-slider__label compare-slider__label--then">1960s</div>
      <div className="compare-slider__label compare-slider__label--now">Now</div>

      <div className="compare-slider__handle" style={{ left: `${pos}%` }}>

        <div className="compare-slider__handle-grip">⟷</div>
        
      </div>

      <input
        type="range"
        min="0"
        max="100"
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="compare-slider__range"
        aria-label={`Drag to compare ${name} then and now`}
      />

    </div>
  );
}

function spawnStars(x, y) {
  const container = document.body;
  const starCount = 14;
  const symbols = ['✦', '✧', '★', '⋆'];

  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('span');
    star.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    star.className = 'star-particle';

    const angle = (Math.PI * 2 * i) / starCount + Math.random() * 0.5;
    const distance = 60 + Math.random() * 90;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    const rot = Math.random() * 360;
    const size = 10 + Math.random() * 14;
    const duration = 0.6 + Math.random() * 0.5;

    star.style.left = `${x}px`;
    star.style.top = `${y}px`;
    star.style.fontSize = `${size}px`;
    star.style.setProperty('--tx', `${tx}px`);
    star.style.setProperty('--ty', `${ty}px`);
    star.style.setProperty('--rot', `${rot}deg`);
    star.style.animationDuration = `${duration}s`;

    container.appendChild(star);
    star.addEventListener('animationend', () => star.remove());
  }
}

function Innovations() {
  const [active, setActive] = useState(0);
  const current = innovations[active];

  useEffect(() => {
    document.documentElement.style.setProperty('--custom-html-bg', `url("${spaceBg.src}")`);
    return () => {
      document.documentElement.style.removeProperty('--custom-html-bg');
    };
  }, []);

  const handleInnovationClick = (i, event) => {
    setActive(i);
    const rect = event.currentTarget.getBoundingClientRect();
    spawnStars(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };
 
  return (
    <div className="innovations">

      <nav className="innovation-nav">

        {innovations.map((item, i) => (

          <button 
            key={item.name} 
            className={i === active ? 'active' : ''} 
            onClick={(e) => handleInnovationClick(i, e)}>
            {item.name}
          </button>

        ))}

      </nav>

      <p className="innovation-hint">Drag the ↔ handle below to compare then and now</p>

      <div key={active} className="innovation-fade">

        <CompareSlider
          thenImg={current.thenImg}
          nowImg={current.nowImg}
          name={current.name}
        />
 
        <div className="innovation-columns">

          <div className="innovation-box">

            <h2>APOLLO 1960s</h2>
            <p>{current.then}</p>

          </div>

          <div className="innovation-box">

            <h2>MODERN LIFE NOW</h2>
            <p>{current.now}</p>

          </div>

        </div>

      </div>
      
      <footer className="innovation-footer">

        <a href="/csarch2-virtual-exhibits/s03g4/agc-homepage/"> Return to Homepage </a>

      </footer>

    </div>
  );
}
 
export default Innovations
 