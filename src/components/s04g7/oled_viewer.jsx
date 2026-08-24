import OledModel from "./oled_model.jsx";
import React, { useState, useEffect, useRef } from "react";
import '../../styles/s04g7/oled.css';
import '../../styles/s04g7/pagebg.css';
import '../../styles/s04g7/era.css';

// OLED layers displayed in the interactive 3D model
const PARTS = [
    {
        id: "substrate",
        label: "Substrate",
        description:
            "The base layer, often made of glass, plastic or metallic foil, that provides structural and mechanical support for the device.",
        processOLEDDescription:
           "Provides a stable foundation for depositing all other OLED layers; must be flat, clean, and resistant to heat and chemicals."
    },
    {
        id: "anode",
        label: "Anode",
        description:
           "A transparent and conductive electrode, commonly made of indium tin oxide (ITO), that serves as the positive electrode of the OLED.",
        processOLEDDescription:
           "Injects positive charge carriers (holes) into the organic layers when voltage is applied."
    },
    {
        id: "cathode",
        label: "Cathode",
        description:
            "The negative electrode of the OLED, that may be transparent or reflective, depending on the display's design.",
        processOLEDDescription:
           "Injects negative charge carriers (electrons) into the organic layers when voltage is applied."
    },
     {
        id: "htl",
        label: "Hole Transport Layer (HTL)",
        description:
           "The layer that facilitates hole movement from the anode towards the emissive layer.",
        processOLEDDescription:
           "Moves holes efficiently while blocking electrons to ensure recombination happens in the correct region."
    },
    {
        id: "eml",
        label: "Emissive Layer (EML)",
        description:
           "The layer where electron–hole recombination occurs to produce light.",
        processOLEDDescription:
           "When electrons and holes meet here, energy is released in the form of visible light; color depends on the organic material used."
    },
    {
        id: "etl",
        label: "Electron Transport Layer (ETL)",
        description:
           "The layer that assists movement of electrons from the cathode toward the emissive region.",
        processOLEDDescription:
           "Moves electrons efficiently while blocking holes to improve light output and efficiency."
    },
    {
        id: "encapsulation",
        label: "Encapsulation Layer",
        description:
           "Protective barrier that seals the OLED structure to prevent damage from moisture, oxygen, and physical contact.",
        processOLEDDescription:
           "Extends the lifespan of the display by keeping air and water away from sensitive organic materials."
    }
];

// OLED structure information
const panelType = [
    {
       id: "oled",
       label: "OLED Structure",
       description: "OLED displays are self-emissive — each pixel produces its own light without needing a separate backlight source. This allows thinner design, deeper blacks, and faster response times compared to LCD."
    }
];

// page tabs
const TABS = [
    { id: "model", label: "Model" },
    { id: "evolution", label: "Evolution" },
    { id: "tech", label: "Technical Description" },
    { id: "apps", label: "Applications" },
    { id: "perf", label: "Performance Evaluation" },
    { id: "quiz", label: "Quiz Challenge" },
    { id: "refs", label: "References" }
];

// Quiz question pool for OLED Technology 
const QUESTION_POOL = [
    {
        question: "What year was OLED first developed?",
        options: ["1979", "1987", "1995", "2002"],
        correct: 1
    },
    {
        question: "Which layer produces light in an OLED display?",
        options: ["Substrate", "Anode", "Emissive Layer", "Encapsulation"],
        correct: 2
    },
    {
        question: "What is the main advantage OLED has over LCD?",
        options: ["Uses a backlight", "Self-emissive pixels", "Cheaper to manufacture", "Shorter lifespan"],
        correct: 1
    },
    {
        question: "Which technology uses quantum dots to convert blue light?",
        options: ["WOLED", "OLED", "QD-OLED", "LCD"],
        correct: 2
    },
    {
        question: "What does OLED stand for?",
        options: ["Organic Light Emitting Diode", "Optical Light Energy Display", "Original Light Emitting Diode", "Organic Low Emission Device"],
        correct: 0
    },
    {
        question: "Which OLED type uses red, green, blue, and white subpixels?",
        options: ["QD-OLED", "WOLED", "AMOLED", "PMOLED"],
        correct: 1
    },
    {
        question: "Who were the first developers of OLED technology?",
        options: ["Tesla & Edison", "Tang & Van Slyke", "Samsung & LG", "Gates & Jobs"],
        correct: 1
    },
    {
        question: "What material is commonly used for the transparent anode?",
        options: ["Silicon", "Indium Tin Oxide", "Copper", "Plastic"],
        correct: 1
    },
    {
        question: "What happens when electrons and holes meet in the emissive layer?",
        options: ["The display turns off", "Heat is generated", "Light is produced", "Electricity stops"],
        correct: 2
    },
    {
        question: "Which component protects OLEDs from moisture and oxygen?",
        options: ["Encapsulation Layer", "Hole Transport Layer", "Cathode", "Color Filter"],
        correct: 0
    },
    {
        question: "What color does QD-OLED use as its primary light source?",
        options: ["Red", "Green", "Blue", "White"],
        correct: 2
    },
    {
        question: "True or False: OLED requires a separate backlight to work.",
        options: ["True", "False"],
        correct: 1
    },
    {
        question: "What does the Hole Transport Layer do?",
        options: ["Blocks all light", "Moves holes from anode to emissive layer", "Creates electricity", "Converts blue light to red light"],
        correct: 1
    },
    {
        question: "What is the typical maximum contrast ratio of OLED displays?",
        options: ["1000:1", "10,000:1", "1,000,000:1", "Infinite"],
        correct: 3
    },
    {
        question: "Which is a key disadvantage of OLED compared to LCD?",
        options: ["Thicker display structure", "Slower pixel response", "Risk of image burn-in", "Requires a backlight"],
        correct: 2
    },
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

export default function OledViewer() {
    const [activeTab, setActiveTab] = useState('model');             // Which section is currently open (3D model or quiz)
    const [hoveredIdx, setHoveredIdx] = useState(null);             // for the hover effect in the menu tab
    const [selectedPart, setSelectedPart] = useState('substrate');   // Selected OLED layer to show details
    const [animateLight, setAnimateLight] = useState(false);         // Selected OLED layer to show details
    const activeBtn = (current, target) => `btn ${current === target ? 'active' : ''}`;  // Selected OLED layer to show details
    const panelInfo = panelType[0];                                  // Current OLED panel data
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
        <div className="oled-page">
            <div className="bg"></div>
          
            <div className="oled-nav-header">
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
                    <div className="oled-top-side">
                        <h2 className="oled-info_title">General Process</h2>
                        <p className="oled-info_desc">
                            An OLED is a self-emissive display made of organic semiconductor layers
                            sandwiched between two electrodes. When voltage is applied, electrons
                            and holes are injected from opposite sides and move toward each other.
                            They meet and recombine in the emissive layer, releasing energy as
                            visible light through electroluminescence. Each pixel works independently
                            and can be fully turned off, resulting in true black levels, high
                            contrast, and fast response times.
                        </p>
                    </div>

                    <div className="oled-split-layout">
                        <div className="oled-info-side">
                            <h2 className="oled-info_title">{activeInfo.label}</h2>
                            <p className="oled-info_desc">{activeInfo.description}
                            </p>
                            
                            <div className="oled-dynamic-box" style={{ marginTop: '2rem' }}>
                                <h3 className="oled-info_title">Function</h3>
                                <p className="oled-info_desc">{activeInfo.processOLEDDescription}
                                </p>

                                <h3 className="oled-info_title">{panelInfo.label}</h3>
                                <p className="oled-info_desc">{panelInfo.description}
                                </p>
                            </div>
                        </div>

                        <div className="oled-model-side">
                            <p className="oled-info_desc">
                                💡 Select a layer or animate the light below!
                                <br></br>
                                Move the model around or zoom in to view the different layers!
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
                                    className={`btn-animate-light ${animateLight ? 'active-glow' : ''}`}
                                    onClick={() => setAnimateLight(!animateLight)}
                                >
                                    {animateLight ? 'Stop Light' : 'Click To Animate Light'}
                                </button>
                            </div>

                            <OledModel
                                animateLight={animateLight}
                                selectedPart={selectedPart}
                                setSelectedPart={setSelectedPart}
                            />
                        </div>
                    </div>
                </>
            ): (
                <div className="oled-top-side">
                    {activeTab === 'evolution' && (
                        <>
                            <h2 className="oled-info_title">Evolution</h2>
                            <img
                               src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpoVbuxQzf0FG3W4sQJkM7Cj3ygVx3nsZ99jVbM64K-Q&s=10"
                               alt="OLED display structure"
                               className="oled-image"
                               style={{ marginTop: '0.5rem', marginBottom: '1rem' }}
                            />
                          
                            <p className="oled-info_desc">
                                As OLED technology advanced, manufacturers developed different implementations
                                to improve display performance. Compared with LCD, OLED removes the need for a backlight by
                                allowing each pixel to produce its own light. The two main types used today are WOLED and
                                QD-OLED.
                            </p>

                            <h3 className="oled-info_title">WOLED</h3>
                            <p className="oled-info_desc">
                                White OLED (WOLED) uses a white OLED light source combined with color filters to create red, green, and blue pixels.
                                It maintains OLED’s self-emissive design, providing deep blacks, high contrast, and wide viewing angles.    
                                However, color filters reduce light efficiency compared to newer OLED approaches like QD-OLED.
                                <br></br>  <br></br>
                                WOLED panels typically use four subpixels: red, green, blue, and white.
                                Instead of using separate OLED emitters for each color, a white OLED
                                layer produces light that passes through color filters to create the
                                required colors. The additional white subpixel improves brightness by
                                allowing unfiltered light to pass through when needed.
                            </p>

                            <h3 className="oled-info_title">QD-OLED</h3>
                            <p className="oled-info_desc">
                                Quantum Dot OLED (QD-OLED) is an advanced OLED technology that uses
                                a blue OLED light source with quantum dots to convert blue light into red
                                and green. Introduced commercially in 2022 by Samsung Display, it improves
                                light efficiency, producing higher brightness, a wider color gamut, and
                                better HDR performance while maintaining OLED's deep blacks and fast
                                response times.
                                <br /><br />
                                A QD-OLED panel consists of a blue OLED layer, a quantum dot layer for
                                color conversion, and a TFT backplane that controls individual pixels.
                                Unlike traditional displays that rely on color filters, QD-OLED creates
                                colors through light conversion, improving color accuracy and efficiency.
                            </p>
                        </>
                    )}
                        {activeTab === 'tech' && (
                            <>
                                <div className="oled-intro-split">
                                    {/* LEFT SIDE: Text Content */}
                                    <div className="oled-intro-text">
                                        <h2 className="oled-info_title">Introduction and Fundamentals</h2>
                                        <p className="oled-info_desc">
                                            OLED, or Organic Light-Emitting Diode, is a flat-panel display technology in which each individual pixel emits its own light. This was first developed in 1987 by Ching W. Tang and Steven Van Slyke at Eastman Kodak Company. It consists of multiple thin organic semiconductor layers arranged between two conductive electrodes (anode and cathode), in which light is generated via electroluminescence when an electric field is applied. Electron–hole recombination occurs within the emissive organic layer, releasing energy as visible photons.
                                            <br></br> <br></br>
                                            Because OLEDs are self-emissive, each pixel acts as an independent light source and doesn’t require a backlight unit. This architecture reduces structural thickness and improves power efficiency compared to Liquid Crystal Display (LCD) systems. OLEDs also exhibit high contrast ratios due to true black levels, wide viewing angles, and fast response times resulting from direct light emission. Additionally, the thin-film organic structure enables mechanical flexibility, allowing implementation in flexible and transparent display configurations.
                                        </p>
                                    </div>
                                

                                    <div className="oled-inventor-side">
                                        <div className="inventor-frame">
                                            <img 
                                                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWIZ4IXe6BshUfj4wlNYWPZqATuGAF2FQTcv6Sc3h3yM3NjkL7NhFFxEC82u3zcuJJieiTApgsDS4JIT1in-_9tR-ss3hrfdbDU40EGE-9&s=10" 
                                                alt="Ching W. Tang and Steven Van Slyke" 
                                                className="oled-image"
                                            />
                                        </div>
                                        <p className="inventor-caption">
                                            <strong>Ching W. Tang & Steven Van Slyke</strong><br />
                                            Inventors of the OLED (1987)
                                        </p>
                                    </div>
                                </div>

                                {/* Trial Glowing Pixel Grid  */}
                                <h2 className="oled-info_title"> Close-up View of OLED Pixels</h2>
                                <div style={{ margin: '0rem 0' }}>
                                
                                    {/* Pixel grid structure */}
                                    <div className="oled-pixels">
                                        <div className="pixel red"></div>
                                        <div className="pixel green"></div>
                                        <div className="pixel blue"></div>

                                        <div className="pixel green"></div>
                                        <div className="pixel blue"></div>
                                        <div className="pixel red"></div>

                                        <div className="pixel blue"></div>
                                        <div className="pixel red"></div>
                                        <div className="pixel green"></div>

                                        <div className="pixel red"></div>
                                        <div className="pixel green"></div>
                                        <div className="pixel blue"></div>

                                        <div className="pixel green"></div>
                                        <div className="pixel blue"></div>
                                        <div className="pixel red"></div>

                                        <div className="pixel blue"></div>
                                        <div className="pixel red"></div>
                                        <div className="pixel green"></div>
                                    </div>

                                    <ul className="oled-info_desc" style={{ marginTop: '1rem' }}>
                                        <li><strong>Self-Emissive:</strong> Every subpixel generates its own light</li>
                                        <li><strong>True Black:</strong> Pixels turn completely off with zero glow</li>
                                        <li><strong>Color Precision:</strong> Red, green, and blue mix to produce billions of shades</li>
                                    </ul>
                                </div>
                            </>
                        )}

                        {activeTab === 'apps' && (
                            <>
                            {/* Consumer Electronics */}
                            <div className="oled-intro-split">    
                                {/* LEFT SIDE: Text Content */}
                                <div className="oled-intro-text">
                                     <h2 className="oled-info_title">Applications</h2>
                                    <p className="oled-info_desc">
                                        OLED displays are used in many applications where good image quality, low power use, and flexible design are important. They are commonly used in consumer electronics; this includes smartphones, televisions, tablets, smartwatches, and computer monitors. In these devices, OLEDs are preferred because they are thin and provide high-quality visuals.
                                    </p>
                                </div>

                                {/* RIGHT SIDE: Image */}
                                <div className="oled-inventor-side">
                                    <div className="circle-image-frame">
                                        <img 
                                            src="https://newsbytes.ph/wp-content/uploads/2026/05/Galaxy-Z-Fold7.jpg" 
                                            alt="Smartphone OLED Display" 
                                            className="inventor-img"
                                        />
                                    </div>
                                    <p className="inventor-caption">
                                        <strong>Smartphone OLED Display</strong>
                                    </p>
                                </div>
                            </div>

                            {/* Automotive & Wearable */}
                            <div className="oled-intro-split">    
                                {/* LEFT SIDE: Image */}
                                <div className="oled-inventor-side">
                                    <div className="circle-image-frame">
                                        <img 
                                            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS6D9B34bleV8Zf5ZQrgIVyNtSr1LLjAcZMzIj3jyh8P4DcsC82t5YxchE2&s=10" 
                                            alt="Automotive OLED Display" 
                                            className="inventor-img"
                                        />
                                    </div>
                                    <p className="inventor-caption">
                                        <strong>Automotive OLED Dashboard</strong>
                                    </p>
                                </div>

                                {/* RIGHT SIDE: Text Content */}
                                <div className="oled-intro-text">
                                    <p className="oled-info_desc">
                                        They are also used in automotive systems, such as digital dashboards, infotainment screens, and head-up displays (HUDs); these benefit from high contrast and good visibility in different lighting conditions. OLED technology is also applied in wearable devices and VR/AR systems, where fast response times and low motion blur are important for smooth visual performance.
                                    </p>
                                </div>
                            </div>

                            {/* Industrial & IoT */}
                            <div className="oled-intro-split">    
                                {/* LEFT SIDE: Text Content */}
                                <div className="oled-intro-text">
                                    <p className="oled-info_desc">
                                        In industrial and embedded systems, OLEDs are used in control panels, handheld instruments, and monitoring devices; they are useful because they are compact and reliable. For IoT devices, OLEDs are used in smart home products and low-power sensors where space and energy efficiency are important. Overall, OLEDs are flexible and scalable; this makes them suitable for both everyday consumer products and specialized technical systems.
                                    </p>
                                </div>

                                {/* RIGHT SIDE: Image */}
                                <div className="oled-inventor-side">
                                    <div className="circle-image-frame">
                                        <img 
                                            src="https://dlcdnwebimgs.asus.com/files/media/a9577340-698f-4813-aae9-3c5933952fc7/v1/img/proart/oled-4.jpg" 
                                            alt="OLED Industrial Display" 
                                            className="inventor-img"
                                        />
                                    </div>
                                    <p className="inventor-caption">
                                        <strong>OLED Professional Monitor</strong>
                                    </p>
                                </div>
                            </div>  
                            </>
                        )}

                        {activeTab === 'perf' && (
                            <>
                                <h3 className="oled-info_title">Advantages</h3>
                                <ul className="oled-info_desc">
                                    <li>Thin and flexible design — can be under 1mm thick, supports bending/folding</li>
                                    <li>Wide viewing angle (~180°) with minimal color/brightness shift</li>
                                    <li>True blacks and infinite contrast ratio</li>
                                    <li>Ultra-fast response time (microsecond range)</li>
                                    <li>Energy efficient for dark or black content</li>
                                    <li>Supports transparent and rollable display formats</li>
                                </ul>

                                <h3 className="oled-info_title">Limitations</h3>
                                <ul className="oled-info_desc">
                                    <li>Shorter lifespan compared to LCD (~5,000 hours for some panels)</li>
                                    <li>Higher manufacturing cost due to precision processes</li>
                                    <li>Risk of permanent burn-in from static content</li>
                                    <li>Potential brightness non-uniformity and color shift over time</li>
                                </ul>
                            </>
                        )}

                        {activeTab === 'quiz' && (
                            <div style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
                                <h2 className="oled-info_title">🧠 OLED Quiz Challenge</h2>
                                <p className="oled-info_desc">
                                    Test what you’ve learned about OLED technology! Answer all 5 questions to get your score.
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
                                        <h3 className="oled-info_title" style={{ marginBottom: '1.5rem' }}>
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
                                        <h3 className="oled-info_title" style={{ animation: 'bounceIn 0.6s ease-out', fontSize: '2.2rem', fontWeight: '900', position: 'relative', zIndex: 2 }}>🎉 QUIZ COMPLETE! 🎉</h3>
                                        
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
                                        <p className="oled-info_desc" style={{ 
                                            fontSize: '1.4rem', 
                                            fontWeight: '700',
                                            animation: 'fadeUp 0.8s ease-out 0.4s both',
                                            lineHeight: '1.6',
                                            position: 'relative',
                                            zIndex: 2
                                        }}>
                                            {score === 5 ? "🌟 PERFECT SCORE! YOU’RE AN OLED EXPERT!" 
                                            : score >= 3 ? "✨ AWESOME JOB! YOU KNOW YOUR OLED STUFF!" 
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
                                    <p className="oled-info_desc" style={{ textAlign: 'center', marginTop: '2rem' }}>Loading quiz...</p>
                                )}
                            </div>
                        )}
                    
                        {activeTab === 'refs' && (
                            <>
                                <h2 className="oled-info_title">References</h2>
                                <ul className="oled-info_desc" style={{ lineHeight: '1.7', paddingLeft: '1.5rem' }}>
                                   <li>
                                        Adrian. (2025). <em>OLED Display: key advantages and disadvantages</em>. AllPCB.
                                         <a href="https://www.allpcb.com/allelectrohub/oled-display-key-advantages-and-disadvantages" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a>
                                    </li>
                                    <li>
                                        <em>An introduction to OLED displays</em>. OLED-Info.
                                        <a href="https://www.oled-info.com/oled-introduction" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a>
                                    </li>
                                   <li>
                                        Avantama. (2019, January 28). <em>4 Current applications for OLED devices</em>. Avantama AG.{' '}
                                        <a href="https://avantama.com/current-applications-oled-devices/" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a>
                                    </li>
                                    <li>
                                        Avantama. (2020, March 10). <em>Advantages & Disadvantages of OLED technology</em>. Avantama AG.{' '}
                                        <a href="https://avantama.com/advantages-disadvantages-oled-technology/" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a>
                                    </li>
                                    <li>
                                        Babcock, A. (2025, December 4). <em>What is QD-OLED?: The pros and cons of QD-OLED TVs</em>. RTINGS.com.{' '}
                                        <a href="https://www.rtings.com/tv/learn/what-is-qd-oled" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a>
                                    </li>
                                    <li>
                                        Butts, J. (2024, October 4). <em>4 differences between OLED and QD-OLED</em>. XDA Developers.{' '}
                                        <a href="https://www.xda-developers.com/4-differences-oled-qdoled/" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a>
                                    </li>
                                    <li>
                                        Electronics For You. (2024, April 4). <em>OLED Displays and their applications | Learning Corner for Beginners</em>. Electronics For You.{' '}
                                        <a href="https://www.electronicsforu.com/resources/oled-displays-applications" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a>
                                    </li>
                                    <li>
                                        Freudenrich, C. (n.d.). <em>How OLEDs Work</em>. HowStuffWorks.{' '}
                                        <a href="https://electronics.howstuffworks.com/oled1.htm" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a>
                                    </li>
                                    <li>
                                        Freudenrich, C. (n.d.). <em>How OLEDs Work (Full Guide)</em>. HowStuffWorks.{' '}
                                        <a href="https://electronics.howstuffworks.com/oled.htm" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a>
                                    </li>
                                    <li>
                                        Hill, B. (2025, April 5). <em>WOLED vs QD-OLED Monitors – which panel technology is better?</em>. Tom’s Hardware.{' '}
                                        <a href="https://www.tomshardware.com/monitors/gaming-monitors/woled-vs-qd-oled-monitors-which-panel-technology-is-better" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a>
                                    </li>
                                    <li>
                                        Luke. (2024, May 20). <em>Exploring OLED Display: Advantages and applications</em>. Riverdi.{' '}
                                        <a href="https://riverdi.com/blog/exploring-oled-display-advantages-and-applications?srsltid=AfmBOopz33hjTo6LkKs4FW7xY_0iZnJDuhotTsexB8SIw3jsPHX2o5fa" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a>
                                    </li>
                                    <li>
                                        Philips. (2026, January 14). <em>QD OLED vs OLED: What’s the difference?</em>. Philips Monitor Knowledge Library.{' '}
                                        <a href="https://www.philips.co.uk/c-e/monitor-knowledge-library/oled-qd-oled/qd-oled-vs-oled-what-is-the-difference" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a>
                                    </li>
                                    <li>
                                        Proculus Technologies. (n.d.). <em>What is an OLED display and how does it work: Find out</em>. Proculus Technologies Co., Ltd.{' '}
                                        <a href="https://www.proculustech.com/what-is-an-oled-display" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a>
                                    </li>
                                    <li>
                                        Rocha, P. (2026, January 8). <em>What is QD-OLED? The Next Evolution in Gaming Monitors</em>. ViewSonic Library.{' '}
                                        <a href="https://www.viewsonic.com/library/gaming/what-is-qd-oled/" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a>
                                    </li>
                                    <li>
                                        Rocha, P. (2026, January 15). <em>QD-OLED vs. OLED Gaming Monitors: What’s the Difference?</em>. ViewSonic Library.{' '}
                                        <a href="https://www.viewsonic.com/library/gaming/qd-oled-vs-oled-gaming-monitors-whats-the-difference/" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a>
                                    </li>
                                    <li>
                                        RS Components. (2023, October 5). <em>The Complete Guide to OLED Displays</em>. RS Discovery Hub.{' '}
                                        <a href="https://twen.rs-online.com/web/content/discovery/ideas-and-advice/oled-displays-guide?srsltid=AfmBOopoYfOFaQ_qP3ovPFrVmiZ7nv4ycx_HgpVZu_yVBZX5FhrW9fCc" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a>
                                    </li>
                                    <li>
                                        Universal Display Corporation. (n.d.). <em>Organic Light Emitting Diodes (OLEDs)</em>. Universal Display Corporation.{' '}
                                        <a href="https://oled.com/oleds/" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a>
                                    </li>
                                    <li>
                                        Williams, N. (n.d.). <em>History of OLEDs</em>. Ossila.{' '}
                                        <a href="https://www.ossila.com/pages/history-of-oleds" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
                                            Link to Article
                                        </a>
                                    </li>
                                    <li>
                                        Woodford, C. (2022, September 1). <em>OLEDs (Organic LEDs) and LEPs (light-emitting polymers)</em>. Explain That Stuff.{' '}
                                        <a href="https://www.explainthatstuff.com/how-oleds-and-leps-work.html" target="_blank" rel="noopener noreferrer" style={{ color: '#5076a7', textDecoration: 'underline' }}>
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