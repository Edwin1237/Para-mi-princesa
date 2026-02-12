// Variables globales
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const messageEl = document.getElementById('love-message');
const startBtn = document.getElementById('start-btn');
const musicToggle = document.getElementById('music-toggle');
const audio = document.getElementById('background-music');

let isMusicPlaying = false;

// Mensajes de amor
const messages = {
    open: [
        "Tu mano abierta me invita a soñar contigo eternamente...",
        "Con tu palma extendida, siento una paz infinita en tu amor...",
        "Esa ternura en tus dedos me hace sentir amado...",
        "Tu gesto suave despierta mi corazón dormido..."
    ],
    closed: [
        "Tu puño cerrado enciende un fuego apasionado en mí...",
        "Esa fuerza en tus manos me atrae irresistiblemente...",
        "Tu pasión contenida me hace arder de deseo...",
        "Con ese apretón, siento la intensidad de tu amor..."
    ],
    default: "Mueve tu mano frente a la cámara para descubrir mensajes de amor..."
};

// Three.js setup
const scene = new THREE.Scene();
const camera3D = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('threejs-container').appendChild(renderer.domElement);

// Partículas
const particleCount = 1000;
const positions = new Float32Array(particleCount * 3);
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const material = new THREE.PointsMaterial({ color: 0xff69b4, size: 2 });
const particles = new THREE.Points(geometry, material);
scene.add(particles);

camera3D.position.z = 5;

// MediaPipe Hands
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults(onResults);

// Función para iniciar
startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.play();
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const camera = new Camera(video, {
            onFrame: async () => {
                await hands.send({ image: video });
            },
            width: 640,
            height: 480
        });
        camera.start();
        startBtn.style.display = 'none';
    } catch (err) {
        console.error('Error accessing webcam:', err);
        alert('No se pudo acceder a la webcam. Asegúrate de permitir el acceso.');
    }
});

// Toggle música
musicToggle.addEventListener('click', () => {
    if (isMusicPlaying) {
        audio.pause();
        musicToggle.textContent = 'Música On';
    } else {
        audio.play();
        musicToggle.textContent = 'Música Off';
    }
    isMusicPlaying = !isMusicPlaying;
});

// Procesar resultados de MediaPipe
function onResults(results) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        drawHand(landmarks);
        const gesture = detectGesture(landmarks);
        updateMessage(gesture);
        animateParticles(landmarks);
    } else {
        messageEl.textContent = messages.default;
    }
}

// Dibujar mano en canvas
function drawHand(landmarks) {
    ctx.strokeStyle = '#ff69b4';
    ctx.lineWidth = 2;
    // Dibujar conexiones
    const connections = [
        [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]
    ];
    connections.forEach(([i, j]) => {
        const p1 = landmarks[i];
        const p2 = landmarks[j];
        ctx.beginPath();
        ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
        ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
        ctx.stroke();
    });
    // Dibujar puntos
    landmarks.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x * canvas.width, point.y * canvas.height, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#e91e63';
        ctx.fill();
    });
}

// Detectar gesto
function detectGesture(landmarks) {
    // Calcular si dedos están doblados
    const fingerTips = [8, 12, 16, 20]; // index, middle, ring, pinky
    const fingerMCPs = [5, 9, 13, 17];
    let closedFingers = 0;
    for (let i = 0; i < fingerTips.length; i++) {
        const tip = landmarks[fingerTips[i]];
        const mcp = landmarks[fingerMCPs[i]];
        const distance = Math.sqrt((tip.x - mcp.x)**2 + (tip.y - mcp.y)**2);
        if (distance < 0.1) { // threshold
            closedFingers++;
        }
    }
    // Thumb
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const thumbDistance = Math.sqrt((thumbTip.x - thumbIP.x)**2 + (thumbTip.y - thumbIP.y)**2);
    if (thumbDistance < 0.05) {
        closedFingers++;
    }
    if (closedFingers >= 3) {
        return 'closed';
    } else {
        return 'open';
    }
}

// Actualizar mensaje
function updateMessage(gesture) {
    const msgArray = messages[gesture];
    if (msgArray) {
        const randomMsg = msgArray[Math.floor(Math.random() * msgArray.length)];
        messageEl.textContent = randomMsg;
    }
}

// Animar partículas
function animateParticles(landmarks) {
    const handCenter = landmarks[0]; // wrist
    const targetX = (handCenter.x - 0.5) * 10;
    const targetY = (0.5 - handCenter.y) * 10;
    const targetZ = 0;

    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3] += (targetX - positions[i3]) * 0.01;
        positions[i3 + 1] += (targetY - positions[i3 + 1]) * 0.01;
        positions[i3 + 2] += (targetZ - positions[i3 + 2]) * 0.01;
    }
    particles.geometry.attributes.position.needsUpdate = true;
}

// Animar escena
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera3D);
}
animate();

// Responsive
window.addEventListener('resize', () => {
    camera3D.aspect = window.innerWidth / window.innerHeight;
    camera3D.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});