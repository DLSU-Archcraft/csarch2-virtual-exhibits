import CrtModel from "./crt_model.jsx";
import React, { useState, useEffect, useRef } from "react";
import '../../styles/s04g7/crt.css';
import '../../styles/s04g7/pagebg.css';
import '../../styles/s04g7/era.css';

{/* 
    CRT Parts Information:
    label: Name of CRT Part
    description: CRT Part Description
    processCrtTitle: Name of the Process Associated with the CRT Part
    processCrtDescription: Description of the Associated Process
*/}
const PARTS = [
    {
        id: "gun",
        label: "Electron Gun",
        description:
            "Generates, shapes, and focuses the stream of electrons into a beam. Consists of a heated cathode, anodes, and a focusing assembly.",
        processCrtTitle: "Thermionic Emission and Focusing",
        processCrtDescription:
            "The cathode inside the electron gun heats up, causing it to emit a huge amount of electrons. Positively charged anodes attract the negatively charged electrons from the cathode, accelerating them rapidly toward the screen. During this process, the electrons undergo a process called electrostatic focusing, wherein they are being focused into a beam so that it forms a small spot on the screen using a focusing assembly containing an electron lens.",
    },
    {
        id: "grid",
        label: "Control Grid",
        description:
            "Changes the display's brightness.",
        processCrtTitle: "Brightness Adjusting",
        processCrtDescription:
            "Controls the intensity of the electron beam by adjusting the number of electrons that pass through the grid into the anode area before hitting the screen. Adjusting the intensity of the electron beam would, in turn, change the brightness of the display.",
    },
    {
        id: "deflection",
        label: "Deflection System",
        description:
            "Consists of X-plates and Y-plates that direct the electron beam horizontally and vertically, so it can be precisely aimed at the correct spot on the screen.",
        processCrtTitle: "Deflection",
        processCrtDescription:
            "As the beam travels through the neck of the tube, it passes through the deflection system. Here, the current in the horizontal and vertical coils is being altered to control the trajectory of the electron beam to hit any position on the screen. Hence, the image may be displayed using the whole display screen.",
    },
    {
        id: "screen",
        label: "Phosphorescent Screen",
        description:
            "Coated with phosphorescent material (often tiny dots or stripes). It lights up when struck by the electron beam, creating the image.",
        processCrtTitle: "Display",
        processCrtDescription:
            "The electrons strike the phosphor coating of the screen. As they strike the phosphor coating, the electrons' kinetic energy is converted into visible light. Finally, an image is conjured.",
    },
    {
        id: "vacuum",
        label: "Vacuum Tube Container",
        description:
            "Encloses the whole assembly so electrons can travel freely from the gun to the screen without being scattered by air molecules.",
        processCrtTitle: "Containment",
        processCrtDescription:
            "The entire component is enclosed in a specialized vacuum tube to prevent the electrons from colliding with air molecules. Eliminating this interference ensures the electrons can travel freely in a straight direction toward the phosphorescent screen.",
    },
];

// CRT structure information
const panelType = [
    {
       id: "crt",
       label: "CRT Structure",
       description: "CRT displays are emissive vacuum tubes that project a beam of electrons onto a phosphorescent screen to create visible images. This design allows for ultra-fast response times, wide viewing angles, and rich analog contrast depths compared to early digital screens."
    }
];

// page tabs
const TABS = [
    { id: "model", label: "Model" },
    { id: "intro", label: "Introduction" },
    { id: "apps", label: "Applications & Evaluation" },
    { id: "eval", label: "Performance Evaluation" },
    { id: "quiz", label: "Quiz Challenge" },
    { id: "refs", label: "References" }
];

// Quiz question pool for CRT Technology 
const QUESTION_POOL = [
    {
        question: "What does CRT stand for?",
        options: ["Cathode Ray Tube", "Crystal Radiation Terminal", "Charged Ray Technology", "Computer Resolution Tube"],
        correct: 0
    },
    {
        question: "Who invented the CRT?",
        options: ["Thomas Edison", "Nikola Tesla", "Karl Ferdinand Braun", "Roger Uy"],
        correct: 2
    },
    {
        question: "Which component is responsible for accelerating and shaping emitted electrons into a tight beam?",
        options: ["Deflection Plates", "Electron Gun", "Phosphor Screen", "Base Pins"],
        correct: 1
    },
    {
        question: "What is the primary function of the Control Grid within a CRT?",
        options: ["It alters the beam's direction", "It changes display brightness by adjusting beam intensity", "It maintains vacuum compression", "It converts kinetic energy into visible light"],
        correct: 1
    },
    {
        question: "Why is the internal chamber of a CRT completely vacuum-sealed?",
        options: ["To prevent traveling electrons from scattering due to air molecules", "To reduce heavy operational heat build-up", "To lower the overall physical weight", "To increase ambient brightness"],
        correct: 0
    },
    {
        question: "When was CRT invented?",
        options: ["1895", "1896", "1897", "1898"],
        correct: 2
    },
    {
        question: "Which is NOT an application of CRT?",
        options: ["Oscilloscope", "Early Radar Systems", "MRI Machines", "Old Cellphones"],
        correct: 3
    },
    {
        question: "What did the inventor of the CRT first name it?",
        options: ["Vacuum Tube", "Braun Tube", "Light Tube", "Phosphor Tube"],
        correct: 1
    },
    {
        question: "Which of the following is NOT a disadvantage of CRT?",
        options: ["Portability", "Size", "Required Power", "Response Time"],
        correct: 1
    }
];

// Simple sound effects for the quiz
const playSound = (soundType) => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const volume = audioContext.createGain();

        oscillator.connect(volume);
        volume.connect(audioContext.destination);

        // Sound notes for a correct answer
        if (soundType === "correct") {
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);

            volume.gain.setValueAtTime(0.5, audioContext.currentTime);
            volume.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.4);

        } else if (soundType === "wrong") {    // Sound notes for a wrong answer
            oscillator.type = "triangle";
            oscillator.frequency.setValueAtTime(311.13, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(220, audioContext.currentTime + 0.15);

            volume.gain.setValueAtTime(0.45, audioContext.currentTime);
            volume.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            
        } else if (soundType === "complete") { // Short melody after finishing the quiz
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

// Helper function to shuffle array and pick random unique questions
const getRandomQuestions = (count) => {
  const shuffled = [...QUESTION_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export default function CrtViewer() {
    const [activeTab, setActiveTab] = useState('model');             // Which section is currently open (2D model or quiz)
    const [hoveredIdx, setHoveredIdx] = useState(null);             // for the hover effect in the menu tab
    const [selectedPart, setSelectedPart] = useState('gun');     
    const [animate, setAnimate] = useState(false);
    const activeBtn = (current, target) => `btn ${current === target ? 'active' : ''}`;  // Selected CRT layer to show details
    const panelInfo = panelType[0];                                  // Current CRT panel data
    const activeInfo = PARTS.find((p) => p.id === selectedPart) || PARTS[0];            // Show information for selected layer

    // Quiz States
    const [currentQuestion, setCurrentQuestion] = useState(0);      // Current quiz question index
    const [selectedAnswer, setSelectedAnswer] = useState(null);     // Answer chosen by the user
    const [score, setScore] = useState(0);                          // Count of correct answers
    const [quizComplete, setQuizComplete] = useState(false);        // Checker for quiz status (finish)
    const [quizQuestions, setQuizQuestions] = useState([]);         // Holds random 5 questions
    const canvasRef = useRef(null);                                 // Confetti effect
    const particlesRef = useRef([]);                                // Tracks confetti particles
    const animFrameRef = useRef(null);                              // Saves the animation frame ID

    // Load random questions when quiz tab opens or reset
    useEffect(() => {
        if (activeTab === 'quiz') {
            setQuizQuestions(getRandomQuestions(5));
        }
    }, [activeTab]);

    // Checks or handles the selected answer and moves to the next question
    const handleAnswer = (index) => {
        setSelectedAnswer(index);                                           // Save chosen answer
        const isCorrect = index === quizQuestions[currentQuestion].correct; // Check if answer is correct
        playSound(isCorrect ? 'correct' : 'wrong');                         // Play the corresponding sound effect
        if (isCorrect) setScore(prev => prev + 1);                           // If correct, increment score

        // Short wait/ 1200ms delay before showing the next question
        setTimeout(() => {
            if (currentQuestion < quizQuestions.length - 1) {
                setCurrentQuestion(prev => prev + 1);
                setSelectedAnswer(null);
            } else {
                setQuizComplete(true);       // End the quiz after the last question
                playSound('complete');
            }
        }, 1200); // 1.2 seconds
    };

    // Reset quiz
    const resetQuiz = () => {
        setCurrentQuestion(0);     // Reset to the first question
        setSelectedAnswer(null);   // Reset and clear all selected answers
        setScore(0);               // Reset score
        setQuizComplete(false);    // Toggle quiz as not finished
        setQuizQuestions(getRandomQuestions(5)); // Get and load a new random set of questions 
        particlesRef.current = []; // Clear existing confetti particles
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); // Stop the previous animation if still running
    };

    // Canvas Confetti for Perfect Scores
    useEffect(() => {
        // Exit if the quiz isn't finished or the score isn't perfect
        if (!quizComplete || score !== quizQuestions.length || !canvasRef.current) return; 

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const colors = ['#5076a7', '#9f7aea', '#f56565', '#48bb78', '#ecc94bd6', '#ed64a6'];
        
        // Keep the canvas the same size as its container
        const resizeCanvas = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Generate confetti pieces with random positions and movement
        for (let i = 0; i < 180; i++) {
            particlesRef.current.push({
                // Random starting position on the canvas
                x: Math.random() * canvas.width,
                y: Math.random() * -canvas.height,
               
                size: Math.random() * 8 + 4,     // Random starting position on the canvas
                color: colors[Math.floor(Math.random() * colors.length)], // Pick random color 
                
                // Random falling speeds
                speedX: (Math.random() - 0.5) * 4,
                speedY: Math.random() * 3 + 2,

                // Random starting rotation and falling speed
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 8
            });
        }

        // Animating confetti
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);   // Clear previous frame
            particlesRef.current = particlesRef.current.filter(p => p.y < canvas.height + 20);  // Remove confetti pieces outside canvas
            
             // Remove confetti pieces
            particlesRef.current.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;
                p.rotation += p.rotationSpeed;

                // Apply rotation before drawing the confetti
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);

                // Apply rotation before drawing the confetti
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            });

             // Continue animation if confetti is still visible
            if (particlesRef.current.length > 0) {
                animFrameRef.current = requestAnimationFrame(animate);
            }
        };
        animate();

        // Clean up animation and resize listener when component closes
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [quizComplete, score, quizQuestions.length]);

    return (
        <div className="crt-page">
            <div className="bg"></div>

            {/* Container for Go Back and Menu Tab */}
            <div className="crt-nav-header">
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
                    <div className="crt-top-side">
                        <h2 className="crt-info_title">General Process</h2>
                        <p className="crt-info_desc">
                            A CRT is an emissive display made of an electron gun and a phosphorescent screen enclosed within a specialized vacuum tube. When the internal cathode heats up, it emits electrons that are accelerated by anodes and focused into a tight beam. As this beam travels, a control grid adjusts its intensity to modify the brightness, while horizontal and vertical deflection plates direct its trajectory across the entire display screen. When the electrons strike the phosphorescent coating, their kinetic energy is converted into visible light, resulting in very bright images, high contrast capabilities, and exceptionally fast response times.
                        </p>
                    </div>

                    <div className="crt-split-layout">
                        <div className="crt-info-side">
                            <h2 className="crt-info__title">{activeInfo.label}</h2>
                            <p className="crt-info__desc">{activeInfo.description}</p>

                            <div className="crt-dynamic-box" style={{ marginTop: '2rem' }}>
                                <h3 className="crt-info__title">{activeInfo.processCrtTitle}</h3>
                                <p className="crt-info__desc">{activeInfo.processCrtDescription}</p>
                            </div>
                        </div>

                        {/* RIGHT SIDE: Controls and 2D Model */}
                        <div className="crt-model-side">
                            {/* 2D Model Parts */}
                            <p className="oled-info_desc">
                                💡 Select a part or animate the light below!
                                <br></br>
                                You may also click the different parts to view them!
                            </p>

                            <div className="controls">
                                <span>Parts:</span>
                                <button className={activeBtn(selectedPart, 'gun')} onClick={() => setSelectedPart('gun')}>Gun</button>
                                <button className={activeBtn(selectedPart, 'grid')} onClick={() => setSelectedPart('grid')}>Grid</button>
                                <button className={activeBtn(selectedPart, 'deflection')} onClick={() => setSelectedPart('deflection')}>Deflection</button>
                                <button className={activeBtn(selectedPart, 'screen')} onClick={() => setSelectedPart('screen')}>Screen</button>
                                <button className={activeBtn(selectedPart, 'vacuum')} onClick={() => setSelectedPart('vacuum')}>Vacuum</button>
                            </div>

                            {/* Beam Control */}
                            <div className="controls">
                                <button
                                    className={`btn-animate-light ${animate ? 'active-glow' : ''}`}
                                    onClick={() => setAnimate(!animate)}
                                >
                                    {animate ? 'Stop Light' : 'Click To Animate Light'}
                                </button>
                            </div>
                            
                            <CrtModel selectedPart={selectedPart} setSelectedPart={setSelectedPart} animate={animate} />
                        </div>
                    </div>
                </>
            ): (
                <div className="crt-top-side">
                    {activeTab === 'intro' && (
                        <div>
                            <div className="crt-intro-split">
                                {/* LEFT SIDE: Text Content */}
                                <div className="crt-intro-text">
                                    <h2 className="crt-info_title">Introduction and Fundamentals</h2>
                                    <p className="crt-info_desc">
                                        A cathode ray tube (CRT) is a specialized vacuum tube that produces images using an electron gun and a phosphorescent screen. It generates a beam of electrons that passes through a pair of deflecting horizontal and vertical plates at different directions to light up the screen. As the electrons strike the phosphor coating of the screen, they emit visible light, creating the images we see.
                                    </p>

                                    <h3 className="crt-info_title" style={{ marginTop: '2rem' }}>Who developed the CRT?</h3>
                                    <p className="crt-info_desc">
                                        This invention was created by Karl Ferdinand Braun in 1897 from the experiments that showed the fluorescence of the glass walls of the imperfect vacuums from early tube devices, indicating the presence of cathode rays. From this, scientists found that these electron beams could be deflected by magnetic fields and could illuminate phosphor-coated surfaces when they came in contact with them. With this, he created the CRT, also known as the “Braun Tube”.
                                    </p>
                                </div>

                                {/* RIGHT SIDE: Image */}
                                <div className="crt-inventor-side">
                                    <div className="inventor-frame">
                                        <img 
                                            src="https://images.computerhistory.org/revonline/images/500004670-03-01.jpg?w=600" 
                                            alt="Karl Ferdinand Braun" 
                                            className="inventor-img"
                                        />
                                    </div>
                                    <p className="inventor-caption">
                                        <strong>Karl Ferdinand Braun</strong><br />
                                        Inventor of the Braun Tube (1897)
                                    </p>
                                </div>
                            </div>

                            <div>
                                <img
                                    src="https://coimages.sciencemuseumgroup.org.uk/55/55/medium_1936_0622__0001_.jpg"
                                    alt="Braun Tube"
                                    className="crt-image"
                                    style={{ marginTop: '0.5rem', marginBottom: '1rem' }}
                                />
                                <p className="inventor-caption">
                                    <strong>Braun Tube (1897)</strong>
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'apps' && (
                        <>
                            <h2 className="crt-info_title">Applications</h2>

                            {/* Scientific Text */}
                            <div className="crt-intro-split">    
                                {/* LEFT SIDE: Text Content */}
                                <div className="crt-intro-text">
                                    <p className="crt-info_desc">
                                        In the early years of its invention, CRT was mainly used as a scientific tool. An example of its application is in the oscilloscope, which is used to study the electrical waveforms produced by oscillations. CRT is used to visualize the graphs of the electrical signal over time.
                                    </p>
                                </div>

                                {/* RIGHT SIDE: Image */}
                                <div className="crt-inventor-side">
                                    <div className="circle-image-frame">
                                        <img 
                                            src="https://i.sstatic.net/CCoTt.jpg" 
                                            alt="Oscilloscope" 
                                            className="inventor-img"
                                        />
                                    </div>
                                    <p className="inventor-caption">
                                        <strong>Oscilloscope</strong><br />
                                    </p>
                                </div>
                            </div>

                            {/* War Text */}
                            <div className="crt-intro-split">    
                                {/* LEFT SIDE: Image */}
                                <div className="crt-inventor-side">
                                    <div className="circle-image-frame">
                                        <img 
                                            src="https://maxmarineelectronics.com/wp-content/uploads/2018/04/SAM_4241.jpg" 
                                            alt="Radar" 
                                            className="inventor-img"
                                        />
                                    </div>
                                    <p className="inventor-caption">
                                        <strong>Analog Radar Display</strong><br />
                                    </p>
                                </div>

                                {/* RIGHT SIDE: Text Content */}
                                <div className="crt-intro-text">
                                    <p className="crt-info_desc">
                                        However, there are other applications of CRT outside of just being a scientific tool. CRTs were also used during the World Wars as the display technology for early radar and sonar systems.
                                    </p>
                                </div>
                            </div>

                            {/* TV Text */}
                            <div className="crt-intro-split">    
                                {/* LEFT SIDE: Text Content */}
                                <div className="crt-intro-text">
                                    <p className="crt-info_desc">
                                        Then, as time moved on, CRT also developed into the technology being used in early television. It first started as only being able to show monochrome pictures (black and white), but later evolved and was able to show other colors. 
                                    </p>
                                </div>

                                {/* RIGHT SIDE: Image */}
                                <div className="crt-inventor-side">
                                    <div className="circle-image-frame">
                                        <img 
                                            src="https://i.pinimg.com/originals/17/4f/a4/174fa46b180e45e5b8e638be8e68558b.gif" 
                                            alt="CRT Television" 
                                            className="inventor-img"
                                        />
                                    </div>
                                    <p className="inventor-caption">
                                        <strong>CRT Television</strong><br />
                                    </p>
                                </div>
                            </div>

                            {/* modern applications first part */}
                            <p className="crt-info_desc">
                                In the present era, CRT usage has diminished with the emergence of newer display technologies. Currently, CRTS are only being used in specific areas due to certain constraints. An example would be in medical imaging devices such as MRI and X-Ray machines, where their high contrast and grayscale capabilities are useful in obtaining more precise analysis. Another area where CRT is still being used is in heavy machinery in the mining, construction, and manufacturing fields due to its reliability in withstanding the various environmental variables in these fields and providing accurate and consistent data to operators.
                            </p>

                            <div style={{ textAlign: 'center', width: '100%' }}>
                                <img
                                    src="https://media.hswstatic.com/eyJidWNrZXQiOiJjb250ZW50Lmhzd3N0YXRpYy5jb20iLCJrZXkiOiJnaWZcL21yaS0xMC5qcGciLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjI5MH19fQ=="
                                    alt="MRI Machine"
                                    className="crt-image"
                                    style={{ marginTop: '0.5rem', marginBottom: '1rem' }}
                                />
                                <p className="inventor-caption">
                                    <strong>MRI Machine</strong>
                                </p>
                            </div>

                            {/* modern applications second part */}
                            <p className="crt-info_desc">
                                Then, aside from these, CRT is still being used because of legacy systems or old technologies that are still being used today. For example, legacy military and aviation systems and retro gaming still use CRT since it can still provide a good display and replacing them would be costly.
                            </p>

                            <div className="char-app-container">
                                {/* sonic card */}
                                <div className="char-app-card">
                                    <div className="sonic-app-display" />
                                </div>

                                {/* mario card */}
                                <div className="char-app-card">
                                    <div className="mario-app-display" />
                                </div>
                            </div>
                            <div style={{ textAlign: 'center', width: '100%' }}>
                                <p className="inventor-caption">
                                    <strong>Sonic and Mario</strong>
                                </p>
                            </div>
                        </>
                    )}

                    {activeTab === 'eval' && (
                        <>
                            <h3 className="crt-info_title">Advantages</h3>
                            <ul className="crt-info_desc">
                                <li>High contrast and brightness capabilities — great for environments with variable lighting</li>
                                <li>Wide viewing angle (~180°) with minimal color/brightness shift</li>
                                <li>Fast response time — useful in scientific visualization and gaming</li>
                            </ul>

                            <h3 className="crt-info_title">Limitations</h3>
                            <ul className="crt-info_desc">
                                <li>Can cause eye damage to viewers watching for long periods of time due to its brightness</li>
                                <li>Less portability due to its size and weight</li>
                                <li>Unsuitable for machines with smaller spaces due to its size</li>
                                <li>Consumes more power compared to newer display technologies</li>
                                <li>Prolonged display of static images could leave permanent marks on the screen</li>
                            </ul>
                        </>
                    )}

                    {activeTab === 'quiz' && (
                        <div style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
                            <h2 className="crt-info_title">🧠 CRT Quiz Challenge</h2>
                            <p className="crt-info_desc">
                                Test what you’ve learned about CRT technology! Answer all 5 questions to get your score.
                                <br /><br />
                                🔊 Turn your volume up for the full experience!
                            </p>

                            {/* Show questions while the quiz is still ongoing */}
                            {!quizComplete && quizQuestions.length > 0 ? (
                                <div style={{ marginTop: '2rem' }}>

                                    {/* Show questions while the quiz is still ongoing */}
                                    <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#666' }}>
                                        Question {currentQuestion + 1} of {quizQuestions.length}
                                    </div>

                                    {/* Displays the current question */}
                                    <h3 className="crt-info_title" style={{ marginBottom: '1.5rem' }}>
                                        {quizQuestions[currentQuestion].question}
                                    </h3>

                                    {/* Displays the current question */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {quizQuestions[currentQuestion].options.map((option, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleAnswer(index)}     // Checks selected answer
                                                disabled={selectedAnswer !== null}      // Disables buttons after an answer is selected
                                                style={{
                                                    padding: '0.85rem 1.25rem',
                                                    textAlign: 'left',
                                                    borderRadius: '8px',
                                                    border: '2px solid #ddd',
                                                    background: selectedAnswer === null   // Changes color based on answer
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
                                    
                                     {/* Show confetti animation for perfect scores */}
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

                                    {/* Quiz Complete Message */}
                                    <h3 className="crt-info_title" style={{ animation: 'bounceIn 0.6s ease-out', fontSize: '2.2rem', fontWeight: '900', position: 'relative', zIndex: 2 }}>🎉 QUIZ COMPLETE! 🎉</h3>
                                    
                                    {/* Final Score Display */}
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
                                    
                                     {/* Display message based on quiz score */}
                                    <p className="crt-info_desc" style={{ 
                                        fontSize: '1.4rem', 
                                        fontWeight: '700',
                                        animation: 'fadeUp 0.8s ease-out 0.4s both',
                                        lineHeight: '1.6',
                                        position: 'relative',
                                        zIndex: 2
                                    }}>
                                        {score === 5 ? "🌟 PERFECT SCORE! YOU’RE AN CRT EXPERT!" 
                                         : score >= 3 ? "✨ AWESOME JOB! YOU KNOW YOUR CRT STUFF!" 
                                         : "💥 NICE TRY! EXPLORE THE TABS AGAIN AND CHALLENGE YOURSELF ONCE MORE!"}
                                    </p>
                                    
                                     {/* Reset Quiz Button */}
                                    <button
                                        onClick={resetQuiz}
                                        className="btn"
                                        style={{ marginTop: '2rem', fontSize: '1.1rem', padding: '0.8rem 2rem', animation: 'fadeUp 0.8s ease-out 0.6s both', position: 'relative', zIndex: 2 }}
                                    >
                                        TRY AGAIN
                                    </button>
                                </div>
                            ) : (
                                <p className="crt-info_desc" style={{ textAlign: 'center', marginTop: '2rem' }}>Loading quiz...</p>
                            )}
                        </div>
                    )}
                  
                    {activeTab === 'refs' && (
                        <>
                            <h2 className="crt-info_title">References</h2>
                            <ul className="oled-info_desc" style={{ lineHeight: '1.7', paddingLeft: '1.5rem' }}>
                                <li>
                                    Atwood, S. P. (2024). <em>CRTs brought technology to life for a century</em>. Information Display, 40(4), 40–41.{' '}
                                    <a href="https://doi.org/10.1002/msid.1505" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                        Link to Article
                                    </a>
                                </li>
                                <li>
                                    Bishop, G. D. (1977). <em>The cathode-ray tube</em>. Electronics II, 31–37.{' '}
                                    <a href="https://doi.org/10.1007/978-1-349-03178-8_3" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                        Link to Article
                                    </a>
                                </li>
                                <li>
                                    Clifton, N. J. (1948). <em>The cathode-ray tube typical applications</em>.{' '}
                                    <a href="https://www.worldradiohistory.com/Archive-Early-Radio-Assorted/Pavek-Collection/DuMont-Cathode-Ray-Tube-Typical-Applications-1948.pdf" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                        Link to Document
                                    </a>
                                </li>
                                <li>
                                    Dumitru, D., & Zwarts, M. (2002). Chapter 3 - Instrumentation. In <em>Electrodiagnostic Medicine</em> (pp. 69–97). Hanley & Belfus, Cop.
                                </li>
                                <li>
                                    Ketchum, D. (2024, July 16). <em>The evolution of CRT monitor technology</em>. Electronicdesign.com; Electronic Design.{' '}
                                    <a href="https://www.electronicdesign.com/technologies/industrial/displays/article/55126442/thomas-electronics-the-evolution-of-cathode-ray-tube-crt-monitor-technology" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                        Link to Article
                                    </a>
                                </li>
                                <li>
                                    Singh, N., Wang, J., & Li, J. (2016). <em>Waste cathode rays tube: An assessment of global demand for processing</em>. Procedia Environmental Sciences, 31, 465–474.{' '}
                                    <a href="https://doi.org/10.1016/j.proenv.2016.02.050" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                        Link to Article
                                    </a>
                                </li>
                                <li>
                                    tutorialspoint. (2025). <em>Cathode ray tube in computer graphics</em>. Tutorialspoint.com.{' '}
                                    <a href="https://www.tutorialspoint.com/computer_graphics/computer_graphics_cathode_ray_tube.htm" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                        Link to Article
                                    </a>
                                </li>
                            </ul>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}