import PlasmaModel from "./plasma_model.jsx";
import React, { useState, useEffect, useRef } from "react";
import '../../styles/s04g7/plasma.css';
import '../../styles/s04g7/pagebg.css';
import '../../styles/s04g7/era.css';

const PARTS = [
    {
        id: "substrates",
        label: "Glass Substrates",
        description:
            "Two parallel glass panels placed on both ends that compress the internal components. These form the structure for the display.",
        processPlasmaTitle: "Structural Containment",
        processPlasmaDescription:
            "The front and back glass substrates are sealed together at their edges, trapping every gas cell in between. This rigid sandwich keeps the noble gas mixture enclosed at the correct pressure so each cell can be reliably ionized without the gas leaking or contaminating its neighbors.",
    },
    {
        id: "address",
        label: "Address Electrodes",
        description:
            "Vertical electrodes on the back glass panel that are responsible for selecting which cells to be activated.",
        processPlasmaTitle: "Voltage Application",
        processPlasmaDescription:
            "Electric voltage pulses are sent through the address electrodes to target specific gas cells. Combined with the sustain electrodes on the front panel, this pinpoints exactly which cell, out of the millions on the panel, should be lit for the current frame.",
    },
    {
        id: "sustain",
        label: "Sustain Electrodes",
        description:
            "Pairs of horizontal electrodes on the front glass panel that maintain the discharge once a cell is activated.",
        processPlasmaTitle: "Gas Ionization",
        processPlasmaDescription:
            "Once a cell is addressed, the electric field between the sustain electrode pair causes the neon and xenon gas inside that cell to ionize, transforming it into plasma, the fourth state of matter, and keeping the discharge going for as long as the cell needs to stay lit.",
    },
    {
        id: "gas",
        label: "Neon & Xenon Gas Cells",
        description:
            "Millions of cells filled with noble gas mixtures. Each cell represents one subpixel shown on the display.",
        processPlasmaTitle: "Ultraviolet Emission",
        processPlasmaDescription:
            "Inside the ionized cell, the energized plasma causes the neon and xenon atoms to emit ultraviolet photons. This light is invisible to the human eye on its own, but it is the energy source that will ultimately produce the color seen on screen.",
    },
    {
        id: "mgo",
        label: "Magnesium Oxide (MgO) Layer",
        description:
            "A protective dielectric layer coating the electrodes. It improves discharge efficiency and protects electrodes from damage.",
        processPlasmaTitle: "Discharge Protection",
        processPlasmaDescription:
            "The MgO coating shields the sustain electrodes from the constant bombardment of ions during discharge, reducing wear over millions of ionization cycles while also releasing secondary electrons that make each discharge easier to sustain, improving efficiency.",
    },
    {
        id: "phosphor",
        label: "RGB Phosphor Coating",
        description:
            "Each cell is coated with either red, green, or blue phosphor material that converts ultraviolet light into colored light visible to the human eye.",
        processPlasmaTitle: "Phosphor Excitation & Image Formation",
        processPlasmaDescription:
            "Ultraviolet photons strike the phosphor coating inside each cell, exciting it into emitting visible red, green, or blue light depending on the phosphor color. Millions of these individually controlled RGB subpixels combine their light output to form a full-color image on screen.",
    },
];

const TABS = [
    { id: "model", label: "Model" },
    { id: "evolution", label: "Evolution" },
    { id: "tech", label: "Description" },
    { id: "apps", label: "Applications" },
    { id: "performance", label: "Performance Evaluation" },
    { id: "quiz", label: "Quiz Challenge" },
    { id: "refs", label: "References" }
];

const QUESTION_POOL = [
    {
        question: "What year was the plasma display panel developed?",
        options: ["1964", "1971", "1987", "1995"],
        correct: 0
    },
    {
        question: "What were plasma panels originally designed to be a large-screen alternative to?",
        options: ["LCD", "CRT televisions", "OLED", "Projection TVs"],
        correct: 1
    },
    {
        question: "What two noble gases are commonly used inside plasma cells?",
        options: ["Helium and Argon", "Nitrogen and Oxygen", "Krypton and Radon", "Neon and Xenon"],
        correct: 3
    },
    {
        question: "What state of matter gives plasma displays their name?",
        options: ["Solid", "Liquid", "Gas", "Plasma"],
        correct: 3
    },
    {
        question: "Which electrodes select which cells are activated?",
        options: ["Sustain Electrodes", "Address Electrodes", "Cathode", "Anode"],
        correct: 1
    },
    {
        question: "Which electrodes maintain the discharge once a cell is activated?",
        options: ["Address Electrodes", "MgO Layer", "Sustain Electrodes", "Substrate"],
        correct: 2
    },
    {
        question: "What type of light do ionized gas cells emit before it reaches the phosphor coating?",
        options: ["Infrared", "Ultraviolet", "Visible white light", "Microwave"],
        correct: 1
    },
    {
        question: "What does the RGB phosphor coating do?",
        options: ["Blocks stray light", "Converts ultraviolet light into visible color", "Cools the panel", "Insulates the electrodes"],
        correct: 1
    },
    {
        question: "What is the main purpose of the Magnesium Oxide (MgO) layer?",
        options: ["Protects electrodes and improves discharge efficiency", "Produces color", "Converts UV light to visible light", "Provides structural support"],
        correct: 0
    },
    {
        question: "What were plasma panels originally used for in the 1960s?",
        options: ["Home theater TVs", "Industrial and commercial monochrome displays", "Smartphones", "Gaming consoles"],
        correct: 1
    },
    {
        question: "During which period did plasma TVs become mainstream in home theaters?",
        options: ["1970s", "1980s", "1990s–2000s", "2010s"],
        correct: 2
    },
    {
        question: "Around what year did plasma displays begin to decline?",
        options: ["1995", "2000", "2007", "2015"],
        correct: 2
    },
    {
        question: "Which of these is a key advantage of plasma displays?",
        options: ["Requires a backlight", "True, deep black levels", "Low power consumption", "Lightweight glass construction"],
        correct: 1
    },
    {
        question: "Which of these is a notable limitation of plasma displays?",
        options: ["Narrow viewing angles", "Poor motion handling", "Cannot scale to large sizes", "Risk of screen burn-in"],
        correct: 3
    },
    {
        question: "True or False: Plasma displays are self-emissive, meaning each cell produces its own light.",
        options: ["True", "False"],
        correct: 0
    },
];

const playSound = (soundType) => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const volume = audioContext.createGain();

        oscillator.connect(volume);
        volume.connect(audioContext.destination);

        if (soundType === "correct") {
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);

            volume.gain.setValueAtTime(0.5, audioContext.currentTime);
            volume.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.4);

        } else if (soundType === "wrong") {
            oscillator.type = "triangle";
            oscillator.frequency.setValueAtTime(311.13, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(220, audioContext.currentTime + 0.15);

            volume.gain.setValueAtTime(0.45, audioContext.currentTime);
            volume.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);

        } else if (soundType === "complete") {
            const melody = [523.25, 587.33, 659.25, 783.99, 1046.5];

            melody.forEach((note, index) => {
                const noteOsc = audioContext.createOscillator();
                const noteVolume = audioContext.createGain();

                noteOsc.connect(noteVolume);
                noteVolume.connect(audioContext.destination);

                noteOsc.type = "sine";
                noteOsc.frequency.value = note;

                noteVolume.gain.setValueAtTime(0.4, audioContext.currentTime + index * 0.12);
                noteVolume.gain.exponentialRampToValueAtTime(
                    0.01,
                    audioContext.currentTime + index * 0.12 + 0.5
                );

                noteOsc.start(audioContext.currentTime + index * 0.12);
                noteOsc.stop(audioContext.currentTime + index * 0.12 + 0.5);
            });
        }
    } catch (err) {
    }
};

const getRandomQuestions = (count) => {
    const shuffled = [...QUESTION_POOL].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

export default function PlasmaViewer() {
    const [activeTab, setActiveTab] = useState('model');
    const [hoveredIdx, setHoveredIdx] = useState(null);
    const [selectedPart, setSelectedPart] = useState('substrates');
    const [animate, setAnimate] = useState(false);
    const activeBtn = (current, target) => `btn ${current === target ? 'active' : ''}`;
    const activeInfo = PARTS.find((p) => p.id === selectedPart) || PARTS[0];

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [score, setScore] = useState(0);
    const [quizComplete, setQuizComplete] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState([]);
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);
    const animFrameRef = useRef(null);

    useEffect(() => {
        if (activeTab === 'quiz') {
            setQuizQuestions(getRandomQuestions(5));
        }
    }, [activeTab]);

    const handleAnswer = (index) => {
        setSelectedAnswer(index);
        const isCorrect = index === quizQuestions[currentQuestion].correct;
        playSound(isCorrect ? 'correct' : 'wrong');
        if (isCorrect) setScore(prev => prev + 1);

        setTimeout(() => {
            if (currentQuestion < quizQuestions.length - 1) {
                setCurrentQuestion(prev => prev + 1);
                setSelectedAnswer(null);
            } else {
                setQuizComplete(true);
                playSound('complete');
            }
        }, 1200);
    };

    const resetQuiz = () => {
        setCurrentQuestion(0);
        setSelectedAnswer(null);
        setScore(0);
        setQuizComplete(false);
        setQuizQuestions(getRandomQuestions(5));
        particlesRef.current = [];
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };

    useEffect(() => {
        if (!quizComplete || score !== quizQuestions.length || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const colors = ['#5076a7', '#9f7aea', '#f56565', '#48bb78', '#ecc94bd6', '#ed64a6'];

        const resizeCanvas = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        for (let i = 0; i < 180; i++) {
            particlesRef.current.push({
                x: Math.random() * canvas.width,
                y: Math.random() * -canvas.height,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                speedX: (Math.random() - 0.5) * 4,
                speedY: Math.random() * 3 + 2,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 8
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particlesRef.current = particlesRef.current.filter(p => p.y < canvas.height + 20);

            particlesRef.current.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;
                p.rotation += p.rotationSpeed;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);

                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            });

            if (particlesRef.current.length > 0) {
                animFrameRef.current = requestAnimationFrame(animate);
            }
        };
        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [quizComplete, score, quizQuestions.length]);

    return (
        <div className="plasma-page">
            <div className="bg"></div>

            {/* Header Flex Container for Go Back + Tabs */}
            <div className="plasma-nav-header">
                <div className="back-button-container">
                    <a href="/csarch2-virtual-exhibits/s04g7" className="link-pill lower">
                        ← Go Back
                    </a>
                </div>

                <div
                    className="tabs-wrap"
                    style={{
                        '--active-index': TABS.findIndex(t => t.id === activeTab),
                        '--hover-index': hoveredIdx !== null ? hoveredIdx : TABS.findIndex(t => t.id === activeTab),
                        '--is-hovered': hoveredIdx !== null ? 1 : 0
                    }}
                >
                    <div className="tab-slidebar" />
                    <div className="tab-bar" />

                    {TABS.map((tab, idx) => (
                        <button
                            key={tab.id}
                            className={`tab-label ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                            onMouseEnter={() => setHoveredIdx(idx)}
                            onMouseLeave={() => setHoveredIdx(null)}
                        >
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'model' ? (
                <>
                    <div className="plasma-top-side">
                        <h2 className="plasma-info__title">General Process</h2>
                        <p className="plasma-info__desc">
                            A Plasma Display Panel (PDP) gets its name from plasma, the ionized gas that
                            produces light. The panel is built from two glass panels holding address and
                            sustain electrodes, with millions of cells in between filled with neon (Ne) and
                            xenon (Xe) gas and coated with RGB phosphor. When voltage is applied, the
                            targeted cells ionize into plasma and emit ultraviolet light, which excites the
                            phosphor coating to produce the visible color seen on screen. Each cell operates
                            independently and can be switched off completely, giving true black levels much
                            like other self-emissive display technologies.
                        </p>
                    </div>

                    <div className="plasma-split-layout">
                        <div className="plasma-info-side">
                            <h2 className="plasma-info__title">{activeInfo.label}</h2>
                            <p className="plasma-info__desc">{activeInfo.description}</p>

                            <div className="plasma-dynamic-box" style={{ marginTop: '2rem' }}>
                                <h3 className="plasma-info__title">{activeInfo.processPlasmaTitle}</h3>
                                <p className="plasma-info__desc">{activeInfo.processPlasmaDescription}</p>
                            </div>
                        </div>

                        <div className="plasma-model-side">
                            <p className="plasma-info__desc">
                                💡 Select a layer or animate the discharge below!
                                <br></br>
                                You may also click the different layers to view them!
                            </p>

                            <div className="controls">
                                <span>Select Layer:</span>
                                {PARTS.map(part => (
                                    <button
                                        key={part.id}
                                        className={activeBtn(selectedPart, part.id)}
                                        onClick={() => setSelectedPart(part.id)}
                                    >
                                        {part.label.replace(' Layer', '').replace(' (', '\n(')}
                                    </button>
                                ))}
                            </div>

                            <div className="controls">
                                <button
                                    className={`btn-animate-light ${animate ? 'active-glow' : ''}`}
                                    onClick={() => setAnimate(!animate)}
                                >
                                    {animate ? 'Stop Discharge' : 'Click To Animate Discharge'}
                                </button>
                            </div>

                            <PlasmaModel selectedPart={selectedPart} setSelectedPart={setSelectedPart} animate={animate} />
                        </div>
                    </div>
                </>
            ) : (
                <div className="plasma-top-side">
                    {activeTab === 'evolution' && (
                        <>
                            <h2 className="plasma-info__title">Evolution</h2>
                            <img
                                src="https://cdn.britannica.com/97/72797-050-01A4FC71/Cross-section-subpixel-plasma-display-electricity-electrodes-television-broadcasting.jpg"
                                alt="Plasma display panel"
                                className="plasma-image"
                                style={{ marginTop: '0.5rem', marginBottom: '1rem' }}
                            />

                            <p className="plasma-info__desc">
                                Plasma technology moved through three broad phases over its lifetime: an
                                early run in monochrome industrial and commercial displays, a mainstream
                                era as the flagship large-screen home theater technology, and an eventual
                                decline once competing technologies matured. Even after plasma TVs left the
                                market, the idea of a self-emissive pixel carried forward into the displays
                                that succeeded it.
                            </p>

                            <h3 className="plasma-info__title">Early Use</h3>
                            <div className="plasma-intro-split">
                                {/* LEFT SIDE: Text Content */}
                                <div className="plasma-intro-text">
                                    <p className="plasma-info__desc">
                                        Developed in 1964, plasma panels were originally monochrome orange displays
                                        used for industrial and commercial purposes, such as computer terminals in
                                        schools, airport display boards, and stock exchange displays. They were
                                        most known for their flat form factor and larger visibility capacity
                                        compared to CRT alternatives of the time.
                                        <br /> <br />
                                        The three co-inventors were Donald Bitzer, H. Gene Slottow, and Robert Wilson, 
                                        alongside a team at the University of Illinois. Its initial use was a digital 
                                        display monitor for the PLATO educational computer terminal network.
                                    </p>
                                </div>

                                {/* RIGHT SIDE: Image */}
                                <div className="plasma-inventor-side">
                                    <div className="inventor-frame">
                                        <img
                                            src="https://ws.engr.illinois.edu/sitemanager/viewphoto.aspx?id=13550&s=350"
                                            alt="Photo of Donald Bitzer"
                                            className="inventor-img"
                                        />
                                    </div>
                                    <p className="inventor-caption">
                                        <strong>Donald Bitzer</strong><br />
                                        Co-inventor of the plasma display panel (1964)
                                    </p>
                                </div>
                            </div>

                            <h3 className="plasma-info__title">Later Use</h3>
                            <div className="plasma-intro-split">
                                {/* LEFT SIDE: Image */}
                                <div className="plasma-inventor-side">
                                    <div className="circle-image-frame">
                                        <img
                                            src="https://commons.wikimedia.org/wiki/Special:FilePath/Pioneer%20PDP-436XDE.jpg"
                                            alt="Pioneer home theater plasma television"
                                            className="inventor-img"
                                        />
                                    </div>
                                    <p className="inventor-caption">
                                        <strong>Home Theater Plasma TV</strong>
                                    </p>
                                </div>

                                {/* RIGHT SIDE: Text Content */}
                                <div className="plasma-intro-text">
                                    <p className="plasma-info__desc">
                                        From the 1990s through the 2000s, plasma technology was adopted in home
                                        theater televisions, with major manufacturers offering large-screen plasma
                                        TVs. It was also used in broadcast studios, sports bars, and public display
                                        installations, where its wide screen size and consistent viewing angles
                                        were especially valued.
                                    </p>
                                </div>
                            </div>

                            <h3 className="plasma-info__title">Decline in Use</h3>
                            <p className="plasma-info__desc">
                                Around 2007, as competing display technologies improved in
                                both quality and manufacturing cost, plasma displays began to decline in
                                use, and by the following decade consumer plasma televisions had left the
                                market entirely. Newer technologies outpaced plasma on power
                                efficiency, cost, and sustainability, though the underlying concept of
                                self-emissive pixels was carried into the technologies that replaced it.
                            </p>

                            <div style={{ textAlign: 'center', width: '100%' }}>
                                <img
                                    src="https://commons.wikimedia.org/wiki/Special:FilePath/Plasma%20burn-in%20at%20DFW%20airport.jpg"
                                    alt="Screen burn-in on a plasma display at DFW airport"
                                    className="plasma-image-centered"
                                    style={{ marginTop: '0.5rem', marginBottom: '1rem' }}
                                />
                                <p className="inventor-caption">
                                    <strong>Screen Burn-In on a Plasma Display</strong><br />
                                    A permanent ghost image caused by uneven phosphor wear
                                </p>
                            </div>
                        </>
                    )}

                    {activeTab === 'tech' && (
                        <>
                            <h2 className="plasma-info__title">Introduction and Fundamentals</h2>
                            <p className="plasma-info__desc">
                                A Plasma Display Panel (PDP) is a flat-panel display technology in which
                                each individual cell produces its own light. It was first developed in 1964,
                                originally as monochrome displays for industrial and commercial use. It
                                consists of millions of small gas-filled cells 
                                between two glass panels, in which light is generated when the noble gas
                                inside a cell is electrically ionized into plasma, the fourth state of
                                matter.
                                <br /> <br />
                                Because plasma cells are self-emissive, each one acts as an independent
                                light source and doesn't require a shared backlight unit. This gives plasma
                                displays true black levels, high contrast ratios, wide viewing angles, and
                                fast response times resulting from direct light emission. The dual glass
                                panel construction, however, makes plasma displays heavier and more rigid
                                than later technologies.
                            </p>

                            <div style={{ textAlign: 'center', width: '100%' }}>
                                <img
                                    src="https://distributedmuseum.illinois.edu/wp-content/uploads/2017/12/Plasma-Display-0006443.jpg"
                                    alt="Experimentation with a plasma display intended for a PLATO Terminal"
                                    className="plasma-image-centered"
                                    style={{ marginTop: '0.5rem', marginBottom: '1rem', background: '#fff', padding: '0.5rem', maxWidth: '600px' }}
                                />
                                <p className="inventor-caption">
                                    <strong>Experimentation with a Plasma Display</strong><br />
                                </p>
                            </div>

                            {/* Close-up visual of plasma gas cells */}
                            <h2 className="plasma-info__title">Close-up View of Plasma Gas Cells</h2>
                            <div style={{ margin: '0rem 0' }}>

                                {/* Gas cell grid structure */}
                                <div className="plasma-cells">
                                    <div className="cell red"></div>
                                    <div className="cell green"></div>
                                    <div className="cell blue"></div>
                                    <div className="cell red"></div>
                                    <div className="cell green"></div>
                                    <div className="cell blue"></div>
                                    <div className="cell red"></div>
                                </div>

                                <p className="plasma-info__desc" style={{ marginTop: '1rem', textAlign: 'center' }}>
                                    Each cell is one subpixel where millions of individually controlled red, green, and blue cells combine light output to form a full-color image.
                                </p>
                            </div>
                        </>
                    )}

                    {activeTab === 'apps' && (
                        <>
                            <h2 className="plasma-info__title">Applications</h2>
                            <div className="plasma-intro-split">
                                {/* LEFT SIDE: Text Content */}
                                <div className="plasma-intro-text">
                                    <p className="plasma-info__desc">
                                        Plasma displays were used wherever a large, flat, high-quality screen
                                        mattered most. Documented uses include: computer terminals in schools,
                                        airport display boards and stock exchange displays,
                                        broadcast studios, sports bars, public display installations, and
                                        home theater televisions, which was plasma's mainstream use from the 1990s through the 2000s.
                                    </p>
                                </div>

                                {/* RIGHT SIDE: Image */}
                                <div className="plasma-inventor-side">
                                    <div className="circle-image-frame">
                                        <img
                                            src="https://mb.cision.com/Public/4740/9449478/915e0c84b22efec5_800x800ar.jpg"
                                            alt="public display installation of plasma displays"
                                            className="inventor-img"
                                        />
                                    </div>
                                    <p className="inventor-caption">
                                        <strong>Public Display Installation</strong>
                                    </p>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'performance' && (
                        <>
                            <h3 className="plasma-info__title">Advantages</h3>
                            <div className="plasma-adv-lim">
                                <ul className="plasma-info__desc">
                                    <li>Each cell independently turns off completely, no backlight needed</li>
                                    <li>Self-emissive cells eliminate light-bleeding issues</li>
                                    <li>Image quality stays consistent even from extreme viewing angles</li>
                                    <li>Supported 600Hz subfield driving with motion appearing smooth and blur-free</li>
                                    <li>Scales naturally to large sizes without significant loss of quality</li>
                                </ul>
                            </div>

                            <h3 className="plasma-info__title">Limitations</h3>
                            <div className="plasma-adv-lim">
                                <ul className="plasma-info__desc">
                                    <li>High power consumption when ionizing gas cells</li>
                                    <li>Excessive heat generation during the gas discharge process</li>
                                    <li>permanent screen burn-in due to static images displayed for extended periods</li>
                                    <li>Dual glass panel structure were heavier</li>
                                    <li>Reflective glass surfaces caused visibility issues under bright lighting</li>
                                </ul>
                            </div>
                        </>
                    )}

                    {activeTab === 'quiz' && (
                        <div style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
                            <h2 className="plasma-info__title">🧠 Plasma Quiz Challenge</h2>
                            <p className="plasma-info__desc">
                                Test what you've learned about Plasma Display Panel technology! Answer all
                                5 questions to get your score.
                                <br /><br />
                                🔊 Turn your volume up for the full experience!
                            </p>

                            {!quizComplete && quizQuestions.length > 0 ? (
                                <div style={{ marginTop: '2rem' }}>

                                    <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#666' }}>
                                        Question {currentQuestion + 1} of {quizQuestions.length}
                                    </div>

                                    <h3 className="plasma-info__title" style={{ marginBottom: '1.5rem' }}>
                                        {quizQuestions[currentQuestion].question}
                                    </h3>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {quizQuestions[currentQuestion].options.map((option, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleAnswer(index)}
                                                disabled={selectedAnswer !== null}
                                                style={{
                                                    padding: '0.85rem 1.25rem',
                                                    textAlign: 'left',
                                                    borderRadius: '8px',
                                                    border: '2px solid #ddd',
                                                    background: selectedAnswer === null
                                                        ? 'white'
                                                        : index === quizQuestions[currentQuestion].correct
                                                            ? '#d4edda'
                                                            : selectedAnswer === index
                                                                ? '#f8d7da'
                                                                : 'white',
                                                    borderColor: selectedAnswer === null
                                                        ? '#ddd'
                                                        : index === quizQuestions[currentQuestion].correct
                                                            ? '#28a745'
                                                            : selectedAnswer === index
                                                                ? '#dc3545'
                                                                : '#ddd',
                                                    cursor: selectedAnswer === null ? 'pointer' : 'default',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : quizComplete ? (
                                <div style={{ textAlign: 'center', marginTop: '2rem', padding: '2.5rem', borderRadius: '12px', background: 'rgba(80, 118, 167, 0.08)', position: 'relative', overflow: 'hidden', border: '3px solid #5076a7' }}>

                                    {score === quizQuestions.length && (
                                        <canvas
                                            ref={canvasRef}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                pointerEvents: 'none'
                                            }}
                                        />
                                    )}

                                    <h3 className="plasma-info__title" style={{ animation: 'bounceIn 0.6s ease-out', fontSize: '2.2rem', fontWeight: '900', position: 'relative', zIndex: 2 }}>🎉 QUIZ COMPLETE! 🎉</h3>

                                    <p style={{
                                        fontSize: '4rem',
                                        fontWeight: '900',
                                        margin: '1.5rem 0',
                                        color: '#5076a7',
                                        animation: 'bounceIn 0.8s ease-out 0.2s both',
                                        letterSpacing: '2px',
                                        textShadow: '0 4px 12px rgba(80, 118, 167, 0.3)',
                                        position: 'relative',
                                        zIndex: 2
                                    }}>
                                        {score} / {quizQuestions.length}
                                    </p>

                                    <p className="plasma-info__desc" style={{
                                        fontSize: '1.4rem',
                                        fontWeight: '700',
                                        animation: 'fadeUp 0.8s ease-out 0.4s both',
                                        lineHeight: '1.6',
                                        position: 'relative',
                                        zIndex: 2
                                    }}>
                                        {score === 5 ? "🌟 PERFECT SCORE! YOU'RE A PLASMA EXPERT!"
                                            : score >= 3 ? "✨ AWESOME JOB! YOU KNOW YOUR PLASMA STUFF!"
                                                : "💥 NICE TRY! EXPLORE THE TABS AGAIN AND CHALLENGE YOURSELF ONCE MORE!"}
                                    </p>

                                    <button
                                        onClick={resetQuiz}
                                        className="btn"
                                        style={{ marginTop: '2rem', fontSize: '1.1rem', padding: '0.8rem 2rem', animation: 'fadeUp 0.8s ease-out 0.6s both', position: 'relative', zIndex: 2 }}
                                    >
                                        TRY AGAIN
                                    </button>
                                </div>
                            ) : (
                                <p className="plasma-info__desc" style={{ textAlign: 'center', marginTop: '2rem' }}>Loading quiz...</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'refs' && (
                        <>
                            <h2 className="plasma-info__title">References</h2>
                            <ul className="plasma-info__desc" style={{ lineHeight: '1.7', paddingLeft: '1.5rem' }}>
                                <li>Amano, Y., Yoshida, K., Shionoya, T., & Yokono, S. (1982). <em>New dc plasma display panels and their applications</em>. Displays.</li>
                                <li>Boardman, C. M., & Deschamps, J. (1982). <em>Plasma display panels have come of age</em>. Displays.</li>
                                <li>Edwards, D. (2026, March 17). <em>This is why TV makers no longer use plasma panels after they were all the rage in the 2000s</em>. SBTech. <a href="https://tech.supercarblondie.com/why-tv-makers-no-longer-use-plasma-panels/" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a></li>
                                <li>Garcia, S. (2025, March 1). <em>Why were plasma screens discontinued: Understanding the rise and fall of a revolutionary technology</em>. SmartTechSavvy. <a href="https://smarttechsavvy.com/why-were-plasma-screens-discontinued/" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a></li>
                                <li>Kim, C.H., Kwon, I.E., Park, C.H., Hwang, Y.J., Bae, H.S., Yu, B.Y., Pyun, C.H., & Hong, G.Y. (2000). <em>Phosphors for plasma display panels</em>. Journal of Alloys and Compounds.</li>
                                <li>Miles, S. (2026, April 12). <em>What is PDP Technology Plasma display panels explained</em>. Tech Faq. <a href="https://techfaq.co.uk/what-is-pdp-technology-plasma-display-panels-explained/" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a></li>
                                <li>Pleshko, P., Apperley, N., Zimmerman, L. L., Pearson, K. A., Sherk, T. A., St. Pierre, E. J., Hairabedian, B., Bradney, F., & Foster, R. L. J. (1984). <em>Design of a plasma flat panel large screen display for high volume manufacture</em>. Displays.</li>
                                <li><em>Plasma display panel</em>. (n.d.). ScienceDirect.</li>
                                <li>Srinivas, R. (2026, March 11). <em>Here’s why TV manufacturers stopped using plasma panels</em>. SlashGear. <a href="https://www.slashgear.com/2119826/why-tv-manufacturers-stopped-using-plasma-panels/" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a></li>
                                <li><em>The Fate of Plasma TVs: A Look into their Demise</em>. (n.d.). BBoysLLC. <a href="https://bboysllc.com/blog/the-fate-of-plasma-tvs--a-look-into-their-demise" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a></li>
                                <li>Veronis, G., Inan, U. S., & Pasko, V. P. (2000). <em>Fundamental properties of inert gas mixtures for plasma display panels</em>. IEEE Transactions on Plasma Science.</li>
                                <li>Weber, L. F., & Bitzer, D. L. (2006). <em>History of the plasma display panel</em>. IEEE Transactions on Plasma Science.</li>
                            </ul>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
