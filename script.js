/* script.js — ARES I: Journey to Mars
All variable and function names are written to be readable.
Example:
roverPosition     = how far left/right the rover is (%)
roverPowerLevel   = rover battery % remaining
moveRover('left') = moves the rover left on screen */


/* 
GSAP SETUP
We use GSAP's ScrollTrigger plugin to detect when sections
come into view and trigger timeline animations. */
gsap.registerPlugin(ScrollTrigger);


/* STAR FIELD CANVAS
Draws 500 twinkling stars on a <canvas> element.
Also draws soft nebula blobs in the background. */
const starCanvas = document.getElementById('starCanvas');
const starCtx = starCanvas.getContext('2d');
let canvasWidth, canvasHeight;
let starList = [];

/* Resize canvas to always fill the full screen */
function resizeStarCanvas() {
    canvasWidth = starCanvas.width = window.innerWidth;
    canvasHeight = starCanvas.height = window.innerHeight;
}
resizeStarCanvas();
window.addEventListener('resize', resizeStarCanvas);

/* Create 500 star objects with random properties */
for (let i = 0; i < 500; i++) {
    starList.push({
        xPercent: Math.random(),             /* 0–1 horizontal position */
        yPercent: Math.random(),             /* 0–1 vertical position */
        radius: Math.random() * 1.5 + .15, /* star size */
        twinkleOffset: Math.random() * Math.PI * 2,  /* phase so they don't all pulse together */
        twinkleSpeed: Math.random() * .012 + .002,  /* how fast this star twinkles */
        /* Most stars are white, some are warm orange or cool blue */
        color: ['#fff', '#fff', '#fff', '#ffd8b0', '#b8d4ff'][Math.floor(Math.random() * 5)]
    });
}

/* Soft nebula blobs drawn behind the stars */
const nebulaBlobs = [
    { xPercent: .18, yPercent: .22, radiusX: .38, radiusY: .28, color: 'rgba(100,40,160,.055)' },
    { xPercent: .82, yPercent: .7, radiusX: .32, radiusY: .24, color: 'rgba(200,55,18,.045)' },
    { xPercent: .5, yPercent: .5, radiusX: .5, radiusY: .35, color: 'rgba(0,140,220,.03)' },
];

/* Main draw loop — runs every animation frame */
function drawStarField() {
    starCtx.clearRect(0, 0, canvasWidth, canvasHeight);

    /* Draw nebula blobs first (behind stars) */
    nebulaBlobs.forEach(blob => {
        const gradient = starCtx.createRadialGradient(
            blob.xPercent * canvasWidth,
            blob.yPercent * canvasHeight,
            0,
            blob.xPercent * canvasWidth,
            blob.yPercent * canvasHeight,
            blob.radiusX * canvasWidth
        );
        gradient.addColorStop(0, blob.color);
        gradient.addColorStop(1, 'transparent');
        starCtx.fillStyle = gradient;
        starCtx.beginPath();
        starCtx.ellipse(
            blob.xPercent * canvasWidth,
            blob.yPercent * canvasHeight,
            blob.radiusX * canvasWidth,
            blob.radiusY * canvasHeight,
            0, 0, Math.PI * 2
        );
        starCtx.fill();
    });

    /* Draw each star with its twinkle opacity */
    starList.forEach(star => {
        star.twinkleOffset += star.twinkleSpeed;
        const opacity = .15 + .7 * Math.abs(Math.sin(star.twinkleOffset));
        starCtx.save();
        starCtx.globalAlpha = opacity;
        starCtx.fillStyle = star.color;
        starCtx.beginPath();
        starCtx.arc(
            star.xPercent * canvasWidth,
            star.yPercent * canvasHeight,
            star.radius,
            0, Math.PI * 2
        );
        starCtx.fill();
        starCtx.restore();
    });

    requestAnimationFrame(drawStarField);
}
drawStarField();


/* CUSTOM CURSOR
cursorRing = the outer SVG crosshair (lags behind mouse)
cursorDot  = the small sharp dot (follows mouse exactly) */
const cursorRing = document.getElementById('cursorRing');
const cursorDot = document.getElementById('cursorDot');

/* Current actual mouse position */
let mouseX = 500, mouseY = 300;
/* Smoothed position for the ring (lerped toward mouse) */
let ringX = 500, ringY = 300;

/* Track real mouse position */
document.addEventListener('mousemove', function (event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
});

/* Animate the ring to smoothly follow the dot */
function animateCursor() {
    /* Lerp (linear interpolation) — ring slowly catches up to mouse */
    ringX += (mouseX - ringX) * 0.11;
    ringY += (mouseY - ringY) * 0.11;

    /* Position the outer ring (lagging) */
    cursorRing.style.left = ringX + 'px';
    cursorRing.style.top = ringY + 'px';

    /* Position the inner dot (exact) */
    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top = mouseY + 'px';

    requestAnimationFrame(animateCursor);
}
animateCursor();

/* Make cursor grow when hovering interactive elements */
const interactiveElements = 'button, .hazardCard, .timelineItem, .decisionBtn, .dpadBtn, .navBtn, .collectItem, .systemItem';
document.querySelectorAll(interactiveElements).forEach(function (el) {
    el.addEventListener('mouseenter', function () {
        cursorRing.style.transform = 'translate(-50%, -50%) scale(1.5)';
        cursorDot.style.transform = 'translate(-50%, -50%) scale(2.5)';
        cursorDot.style.opacity = '.4';
    });
    el.addEventListener('mouseleave', function () {
        cursorRing.style.transform = 'translate(-50%, -50%) scale(1)';
        cursorDot.style.transform = 'translate(-50%, -50%) scale(1)';
        cursorDot.style.opacity = '1';
    });
});


/* HUD BAR — SCROLL-DRIVEN LIVE STATS
As the user scrolls, the HUD updates:
- Mission Day (T+000 to T+210)
- Distance (0 to 225 million km)
- Velocity (0 to 30.6 km/s)
- Current phase name
 */
const sectionIds = ['launchSection', 'spaceSection', 'orbitSection', 'landingSection', 'explorationSection'];
const phaseNames = ['PRE-LAUNCH', 'INTERPLANETARY CRUISE', 'MARS ORBIT', 'ENTRY, DESCENT & LANDING', 'SURFACE EXPLORATION'];
const maxDistanceKm = 225000000; /* 225 million km to Mars */

window.addEventListener('scroll', function () {
    /* How far the user has scrolled as a 0–1 ratio */
    const totalScrollHeight = document.body.scrollHeight - window.innerHeight;
    const scrollRatio = totalScrollHeight > 0 ? window.scrollY / totalScrollHeight : 0;

    /* Update right gauge fill bar */
    document.getElementById('gaugeFill').style.height = (scrollRatio * 100) + '%';

    /* Update km label on gauge */
    const kmTravelled = Math.round(scrollRatio * maxDistanceKm);
    document.getElementById('gaugeKm').textContent =
        kmTravelled > 999999 ? (kmTravelled / 1e6).toFixed(1) + 'M' : kmTravelled + 'km';

    /* Update HUD stats */
    document.getElementById('hudDistance').textContent =
        kmTravelled > 999999
            ? (kmTravelled / 1e6).toFixed(2) + ' M km'
            : kmTravelled.toLocaleString() + ' km';

    document.getElementById('hudMissionDay').textContent =
        'T+' + String(Math.round(scrollRatio * 210)).padStart(3, '0');

    document.getElementById('hudVelocity').textContent =
        (scrollRatio * 30.6).toFixed(1) + ' km/s';

    /* Work out which section is currently in view */
    let activeSectionIndex = 0;
    sectionIds.forEach(function (id, index) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.55) {
            activeSectionIndex = index;
        }
    });

    /* Update phase name in HUD */
    document.getElementById('hudPhaseName').textContent = phaseNames[activeSectionIndex];

    /* Highlight the correct nav button */
    document.querySelectorAll('.navBtn').forEach(function (btn, index) {
        btn.classList.toggle('active', index === activeSectionIndex);
    });
});


/* LEFT NAV BUTTONS — click to scroll to a section
 */
document.querySelectorAll('.navBtn').forEach(function (btn, index) {
    btn.addEventListener('click', function () {
        document.getElementById(sectionIds[index]).scrollIntoView({ behavior: 'smooth' });
    });
});


/* SCROLL REVEAL
Elements with class .fadeUp or .fadeLeft start hidden.
When they scroll into view, the .visible class is added,
which triggers the CSS transition.
 */
function initScrollReveal() {
    const revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.08 });

    /* Observe all elements that should animate in */
    document.querySelectorAll('.fadeUp, .fadeLeft').forEach(function (el) {
        revealObserver.observe(el);
    });

    /* Immediately show section 0 (launch) without needing to scroll */
    document.querySelectorAll('#launchSection .fadeUp').forEach(function (el) {
        el.classList.add('visible');
    });
}


/* COUNTDOWN TIMER
Counts down from 10:00 while on the launch section.
The centiseconds tick independently (random, for effect).
 */
let countdownTotalSeconds = 600; /* 10 minutes = 600 seconds */
let countdownPaused = false;     /* paused = true after launch starts */

/* Tick every second */
setInterval(function () {
    if (!countdownPaused) {
        countdownTotalSeconds = Math.max(0, countdownTotalSeconds - 1);
        const hours = Math.floor(countdownTotalSeconds / 3600);
        const minutes = Math.floor((countdownTotalSeconds % 3600) / 60);
        const seconds = countdownTotalSeconds % 60;
        document.getElementById('cdHours').textContent = String(hours).padStart(2, '0');
        document.getElementById('cdMinutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('cdSeconds').textContent = String(seconds).padStart(2, '0');
    }
}, 1000);

/* Centiseconds tick at ~20fps for a live feel */
setInterval(function () {
    document.getElementById('cdCentisec').textContent =
        String(Math.floor(Math.random() * 99)).padStart(2, '0');
}, 48);


/* SYSTEMS VERIFICATION CHECKLIST
User clicks each system item to verify it.
Once all 6 are verified, the launch button unlocks.
 */
const verifiedSystems = new Set(); /* stores which system keys have been verified */

document.querySelectorAll('.systemItem').forEach(function (item) {
    item.addEventListener('click', function () {
        const systemKey = item.dataset.systemkey;

        /* Toggle: if already verified, unverify it */
        if (verifiedSystems.has(systemKey)) {
            verifiedSystems.delete(systemKey);
            item.classList.remove('verified');
        } else {
            verifiedSystems.add(systemKey);
            item.classList.add('verified');
        }

        const verifiedCount = verifiedSystems.size;
        const progressEl = document.getElementById('systemsCheckProgress');
        const statusEl = document.getElementById('systemsStatus');
        const launchBtn = document.getElementById('launchBtn');

        progressEl.textContent = verifiedCount + ' / 6';

        if (verifiedCount === 6) {
            /* All systems go! */
            statusEl.textContent = '✓ ALL SYSTEMS GO — READY FOR LAUNCH';
            statusEl.classList.add('allReady');
            launchBtn.disabled = false;
        } else {
            statusEl.textContent = verifiedCount + ' / 6 SYSTEMS VERIFIED';
            statusEl.classList.remove('allReady');
            launchBtn.disabled = true;
        }
    });
});


/* LAUNCH SEQUENCE
Called when the user clicks the big launch button.
Shows a 10-second countdown, then fires the rocket.
 */
function startLaunch() {
    const launchBtn = document.getElementById('launchBtn');
    const rocketWrap = document.getElementById('rocketWrap');
    const rocketFlame = document.getElementById('rocketFlame');

    /* Disable button and show flame */
    launchBtn.disabled = true;
    launchBtn.textContent = '🔥  LAUNCH SEQUENCE INITIATED...';
    rocketFlame.style.display = 'block';
    rocketFlame.style.opacity = '1';
    countdownPaused = true;

    /* Count down from 10 */
    let launchCountdown = 10;

    const launchInterval = setInterval(function () {
        if (launchCountdown > 0) {
            launchBtn.textContent = '🔥  T−' + launchCountdown + '...';
            launchCountdown--;
        } else {
            clearInterval(launchInterval);
            launchBtn.textContent = '🚀  LIFTOFF — ARES I IS GO!';

            /* Add launched class — CSS handles the rocket flying up */
            rocketWrap.classList.add('launched');

            /* Scroll to next section after rocket leaves */
            setTimeout(function () {
                document.getElementById('spaceSection').scrollIntoView({ behavior: 'smooth' });
            }, 2200);
        }
    }, 500);
}


/* TERMINAL LOG LINES
Each terminal (telemetry + science) types its lines
one by one when the section scrolls into view.
 */
function showTerminalLines(lineIdPrefix, totalLines, triggerSectionId) {
    ScrollTrigger.create({
        trigger: '#' + triggerSectionId,
        start: 'top 70%',
        once: true, /* only trigger once */
        onEnter: function () {
            for (let i = 1; i <= totalLines; i++) {
                const lineEl = document.getElementById(lineIdPrefix + i);
                if (lineEl) {
                    /* Stagger: each line appears 360ms after the previous */
                    setTimeout(function () {
                        lineEl.classList.add('visible');
                    }, i * 360);
                }
            }
        }
    });
}


/* JOURNEY TIMELINE
Each milestone in the timeline is built from data attributes
and expands when clicked to show the fact.
 */
function initJourneyTimeline() {
    document.querySelectorAll('.timelineItem').forEach(function (item) {
        const day = item.dataset.day;
        const title = item.dataset.title;
        const fact = item.dataset.fact;

        /* Build the inner HTML from data attributes */
        item.innerHTML =
            '<div class="timelineItemDay">' + day + '</div>' +
            '<div class="timelineItemTitle">' + title + '</div>' +
            '<div class="timelineItemFact">' + fact + '</div>';

        /* Click toggles the expanded/collapsed state */
        item.addEventListener('click', function () {
            item.classList.toggle('open');
        });
    });

    /* Stagger the timeline items appearing as section scrolls in */
    ScrollTrigger.create({
        trigger: '#spaceSection',
        start: 'top 62%',
        once: true,
        onEnter: function () {
            document.querySelectorAll('.timelineItem').forEach(function (item, index) {
                setTimeout(function () {
                    item.classList.add('visible');
                }, index * 160);
            });
        }
    });
}


/* ORBIT DECISION (Mars section)
User clicks GO / DELAY / ABORT — each shows a result.
 */
function orbitDecision(choice, clickedBtn) {
    /* Remove .chosen from all buttons, add to clicked one */
    document.querySelectorAll('.decisionBtn').forEach(function (btn) {
        btn.classList.remove('chosen');
    });
    clickedBtn.classList.add('chosen');

    /* Show the appropriate result message */
    const resultMessages = {
        go: '✓ GO confirmed. EDL primed. Targeting Jezero Crater at 18.4°N.',
        delay: 'Orbit extended 1 Sol. Dust storm subsiding. New window: T+211.',
        abort: 'Abort burn locked. Return trajectory confirmed. Earth ETA: 7 months.'
    };
    document.getElementById('decisionResult').textContent = resultMessages[choice];
}


/* EDL SEQUENCE — "7 MINUTES OF TERROR"
Clicking the button plays through 5 stages automatically.
Each stage highlights in sequence on the stage list.
 */
let edlAlreadyStarted = false;

/* Stage data: duration, phase label, altitude label, altitude bar fill % */
const edlStages = [
    { durationSec: 9, phaseLabel: 'ATMOSPHERIC ENTRY — 1,600°C', altLabel: '125 km → 11 km', altFillPercent: 100 },
    { durationSec: 6, phaseLabel: 'PARACHUTE DEPLOYED — MACH 1.7', altLabel: '11 km → 8 km', altFillPercent: 68 },
    { durationSec: 4, phaseLabel: 'HEAT SHIELD JETTISONED', altLabel: '8 km → 2 km', altFillPercent: 42 },
    { durationSec: 5, phaseLabel: 'SKY CRANE ACTIVE', altLabel: '2 km → 0 m', altFillPercent: 14 },
    { durationSec: 3, phaseLabel: '🎉 TOUCHDOWN — JEZERO CRATER', altLabel: '0 m', altFillPercent: 0 },
];

function startEDL() {
    if (edlAlreadyStarted) return;
    edlAlreadyStarted = true;
    document.getElementById('edlStartBtn').disabled = true;

    /* Count down the main timer from 7:00 */
    let timerSeconds = 420; /* 7 minutes = 420 seconds */
    const timerEl = document.getElementById('edlTimer');

    const timerInterval = setInterval(function () {
        timerSeconds = Math.max(0, timerSeconds - 1);
        const mins = Math.floor(timerSeconds / 60);
        const secs = timerSeconds % 60;
        timerEl.textContent = mins + ':' + String(secs).padStart(2, '0');
        if (timerSeconds === 0) clearInterval(timerInterval);
    }, 1000);

    /* Activate each stage in sequence */
    let delaySeconds = 0;

    edlStages.forEach(function (stage, stageIndex) {
        setTimeout(function () {
            /* Update all stage cards */
            document.querySelectorAll('.edlStage').forEach(function (stageEl, cardIndex) {
                const statusEl = stageEl.querySelector('.edlStageStatus');
                if (cardIndex < stageIndex) {
                    /* Past stages: done (green) */
                    stageEl.classList.remove('stageActive');
                    stageEl.classList.add('stageDone');
                    statusEl.textContent = '✓ COMPLETE';
                } else if (cardIndex === stageIndex) {
                    /* Current stage: active (red) */
                    stageEl.classList.add('stageActive');
                    stageEl.classList.remove('stageDone');
                    statusEl.textContent = '● ACTIVE';
                } else {
                    /* Future stages: standby */
                    stageEl.classList.remove('stageActive', 'stageDone');
                    statusEl.textContent = 'STANDBY';
                }
            });

            /* Update the phase tag, altitude bar, and altitude value */
            document.getElementById('edlPhaseTag').textContent = stage.phaseLabel;
            document.getElementById('altitudeFill').style.width = stage.altFillPercent + '%';
            document.getElementById('altitudeValue').textContent = stage.altLabel;
        }, delaySeconds * 1000);

        delaySeconds += stage.durationSec;
    });
}


/* ROVER GAME — EXPLORATION SECTION
The user can drive the rover left/right using:
- The D-pad buttons on screen
- Arrow keys or WASD on keyboard
Clicking items on the surface collects samples.
 */

/* Rover state variables */
let roverPosition = 32;   /* % from left edge (5–91) */
let roverPowerLevel = 100;  /* battery % (0–100) */
let roverTotalDist = 0;    /* total metres driven */
let collectedSamples = new Set(); /* which sample indices have been picked up */

/* Sample info (index matches collectItem0–3 and sampleChip0–3) */
const sampleNames = [
    'Basalt Rock',
    'Water Ice',
    'Dust Sample',
    'Perchlorate'
];
const sampleFacts = [
    'Ancient lava flow — volcanic past confirmed.',
    'Subsurface ice confirmed! Key to future habitation.',
    '90% iron oxide — that\'s what makes Mars red.',
    'Energy-rich compound — possible biosignature.'
];

/* Move the rover left, right, or stop */
function moveRover(direction) {
    if (roverPowerLevel <= 0) {
        updateRoverLog('⚠ POWER DEPLETED. Cannot move rover.');
        return;
    }

    const stepSize = 7; /* how many % units to move per press */

    if (direction === 'left') roverPosition = Math.max(5, roverPosition - stepSize);
    if (direction === 'right') roverPosition = Math.min(91, roverPosition + stepSize);
    /* up / stop — no horizontal movement, just drain a tiny bit of power */

    /* Update the rover emoji position on screen */
    document.getElementById('roverEmoji').style.left = roverPosition + '%';

    /* Drain battery and accumulate distance */
    roverPowerLevel = Math.max(0, roverPowerLevel - 2);
    roverTotalDist += stepSize * 10;

    /* Update Sol day counter (every 4,000 m = 1 Sol) */
    const currentSol = Math.floor(roverTotalDist / 4000) + 1;
    document.getElementById('roverSolDay').textContent = String(currentSol).padStart(3, '0');
    document.getElementById('roverPowerPct').textContent = roverPowerLevel + '%';

    /* Update power bar color (green → gold → red as battery drains) */
    const powerBar = document.getElementById('roverPowerBar');
    powerBar.style.width = roverPowerLevel + '%';
    if (roverPowerLevel > 50) powerBar.style.background = 'var(--colorGreen)';
    else if (roverPowerLevel > 20) powerBar.style.background = 'var(--colorGold)';
    else powerBar.style.background = 'var(--colorRed)';
    document.getElementById('roverPowerVal').textContent = roverPowerLevel + '%';

    /* Update distance bar */
    document.getElementById('roverDistanceBar').style.width = Math.min(100, roverTotalDist / 500) + '%';
    document.getElementById('roverDistanceVal').textContent = roverTotalDist + ' m';

    /* Direction labels for the log */
    const directionLabels = { left: 'LEFT', right: 'RIGHT', up: 'FORWARD', stop: 'STOPPED' };
    updateRoverLog('› MOVING ' + directionLabels[direction] + '. Position: ' + roverPosition + '%. Power: ' + roverPowerLevel + '%.');
}

/* Collect a sample item from the surface */
function collectSample(sampleIndex) {
    /* Don't collect the same item twice */
    if (collectedSamples.has(sampleIndex)) return;

    collectedSamples.add(sampleIndex);

    /* Hide the item from the screen */
    document.getElementById('collectItem' + sampleIndex).classList.add('collected');

    /* Light up the chip in the panel */
    document.getElementById('sampleChip' + sampleIndex).classList.add('collected');

    /* Update count */
    document.getElementById('sampleCount').textContent = collectedSamples.size;

    /* Update storage bar */
    const storagePercent = (collectedSamples.size / 4) * 100;
    document.getElementById('roverStorageBar').style.width = storagePercent + '%';
    document.getElementById('roverStorageVal').textContent = collectedSamples.size + '/4';

    /* Show fact in log */
    updateRoverLog('✓ COLLECTED: ' + sampleNames[sampleIndex] + ' — ' + sampleFacts[sampleIndex]);
}

/* Update the log message strip at the bottom of the rover arena */
function updateRoverLog(message) {
    document.getElementById('roverLog').textContent = message;
}

/* Keyboard controls for the rover */
document.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowLeft' || event.key === 'a') moveRover('left');
    if (event.key === 'ArrowRight' || event.key === 'd') moveRover('right');
    if (event.key === 'ArrowUp' || event.key === 'w') moveRover('up');
});


/* BOOT / LOADING SCREEN
Shown when the page first loads.
A fake progress bar fills up with loading messages,
then the screen fades out and the site is revealed.
 */
(function showBootScreen() {
    /* Create the overlay div */
    const bootOverlay = document.createElement('div');
    bootOverlay.style.cssText =
        'position:fixed;inset:0;background:#04020c;z-index:999999;' +
        'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'gap:22px;transition:opacity 1.2s ease;';

    /* Boot screen HTML */
    bootOverlay.innerHTML = `
    <div style="position:relative;">
<div style="
        font-family:'Bebas Neue',sans-serif;
        font-size:clamp(64px,13vw,130px);
        letter-spacing:10px;
        background:linear-gradient(175deg,#ffffff 0%,#ffb070 35%,#ff5020 70%,#cc1500 100%);
        -webkit-background-clip:text;
        -webkit-text-fill-color:transparent;
        background-clip:text;
        filter:drop-shadow(0 0 50px rgba(220,60,15,.3));
">ARES I</div>
<div style="
        position:absolute;inset:-10px;
        background:radial-gradient(ellipse at 50% 50%,rgba(220,60,15,.08),transparent 70%);
        pointer-events:none;
"></div>
    </div>
    <div style="
font-family:'Rajdhani',sans-serif;
font-size:10px;letter-spacing:6px;
color:rgba(240,112,32,.35);
margin-top:-12px;font-weight:300;
    ">JOURNEY TO MARS — MISSION BRIEFING</div>
    <div style="width:200px;height:1px;background:rgba(255,255,255,.05);position:relative;border-radius:1px;overflow:hidden;">
<div id="bootProgressBar" style="
        position:absolute;inset:0;width:0%;
        background:linear-gradient(to right,#e8431a,#ff9500);
        box-shadow:0 0 12px rgba(232,67,26,.7);
        transition:width .04s;
"></div>
    </div>
    <div id="bootMessage" style="
font-family:'Share Tech Mono',monospace;
font-size:8px;letter-spacing:3px;
color:rgba(255,255,255,.18);
    ">INITIALIZING ARES I SYSTEMS...</div>
`;
    document.body.appendChild(bootOverlay);

    /* Loading messages shown at each 20% increment */
    const bootMessages = [
        'LOADING NAVIGATION COMPUTER...',
        'PRESSURIZING LIFE SUPPORT...',
        'CALIBRATING PROPULSION...',
        'CHECKING HEAT SHIELD INTEGRITY...',
        'SYNCING DEEP SPACE NETWORK...',
        'ALL SYSTEMS GO — COMMENCING BRIEFING'
    ];

    let loadProgress = 0;
    let lastMessageIndex = 0;

    const bootInterval = setInterval(function () {
        /* Increment progress by a random small amount */
        loadProgress += Math.random() * 3 + 0.6;
        if (loadProgress > 100) loadProgress = 100;

        /* Update the progress bar width */
        document.getElementById('bootProgressBar').style.width = loadProgress + '%';

        /* Update message at each 20% step */
        const newMessageIndex = Math.min(
            Math.floor((loadProgress / 100) * bootMessages.length),
            bootMessages.length - 1
        );
        if (newMessageIndex !== lastMessageIndex) {
            lastMessageIndex = newMessageIndex;
            document.getElementById('bootMessage').textContent = bootMessages[newMessageIndex];
        }

        /* When complete: fade out overlay and init everything */
        if (loadProgress >= 100) {
            clearInterval(bootInterval);

            setTimeout(function () {
                bootOverlay.style.opacity = '0';

                setTimeout(function () {
                    bootOverlay.remove();

                    /* Init all interactive features now that DOM is ready */
                    initScrollReveal();
                    showTerminalLines('spaceLine', 6, 'spaceSection');
                    showTerminalLines('sciLine', 7, 'explorationSection');
                    initJourneyTimeline();
                }, 1000);
            }, 700);
        }
    }, 40);
})();