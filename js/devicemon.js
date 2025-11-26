// --- MOTOR 3D Y LÓGICA ---
let scene, camera, renderer, creatureGroup;
let raycaster, mouse;
let particles = [];
let isDragging = false, previousMouseX = 0;

const STATE_KEY = 'devicemon_dna_v4'; 
const ELEMENTS = ['fuego', 'agua', 'planta', 'electrico'];

// --- LABORATORIO ---
const CHEMICALS = [
    { sym: 'H', name: 'Hidrógeno', color: '#74b9ff' },
    { sym: 'C', name: 'Carbono', color: '#636e72' },
    { sym: 'O', name: 'Oxígeno', color: '#81ecec' },
    { sym: 'N', name: 'Nitrógeno', color: '#a29bfe' },
    { sym: 'Fe', name: 'Hierro', color: '#b2bec3' },
    { sym: 'Au', name: 'Oro', color: '#ffeaa7' },
    { sym: 'U', name: 'Uranio', color: '#55efc4' },
    { sym: 'Ca', name: 'Calcio', color: '#fab1a0' },
    { sym: 'Na', name: 'Sodio', color: '#fff766' },
    { sym: 'Cl', name: 'Cloro', color: '#00cec9' },
    { sym: 'K', name: 'Potasio', color: '#6c5ce7' },
    { sym: 'Mg', name: 'Magnesio', color: '#dfe6e9' },
    { sym: 'S', name: 'Azufre', color: '#fdcb6e' },
    { sym: 'P', name: 'Fósforo', color: '#e17055' }
];
let selectedChems = [];

// --- HELPERS DE TIEMPO ---
function isNightTime() {
    const h = new Date().getHours();
    // Duerme entre las 22:00 (10 PM) y las 08:00 (8 AM)
    return h >= 22 || h < 8;
}

function isAsleep() {
    // Solo duerme si es horario nocturno. 
    // Estar lleno (meals >= 3) ya no causa sueño visual, solo impide comer.
    return isNightTime();
}

// Estado
let state = {
    born: false,
    name: 'Huevo',
    element: 'normal',
    level: 1,
    stats: { atk: 0, def: 0, spd: 0 },
    features: { 
        bodyType: 'sphere', eyeType: 'normal', hasWings: false, hasHorns: false 
    },
    meals: 0,       // Comidas hoy
    totalMeals: 0,  // Comidas totales (para evolución)
    lastDay: '',
    dnaId: '',      // ID único corto
    inventory: [],  // Almacén de comida
    discoveries: [], // Recetas descubiertas
    dead: false,
    tutorialSeen: false
};

// --- IDIOMAS ---
var translations = {
    es: {
        lab: "Laboratorio",
        train: "Entrenamiento",
        dex: "Quimera-Dex",
        export: "Exportar / Guardar",
        tutorial: "Guía / Tutorial",
        photo: "Foto",
        reset: "Reiniciar",
        labTitle: "🧪 Laboratorio Quimera",
        labDesc: "Mezcla elementos para crear sueros.",
        serum: "⚗️ SUERO",
        storage: "🎒 Almacén",
        guideTitle: "📚 Guía de Juego",
        understood: "¡ENTENDIDO!",
        dexTitle: "📖 Quimera-Dex",
        discoveries: "Recetas descubiertas",
        closeDex: "CERRAR DEX",
        close: "CERRAR",
        full: "¡Está lleno! No puede comer más hoy.",
        invalidCode: "Código inválido",
        delicious: "¡Delicioso!",
        yuck: "Puaj...",
        tasteless: "Sabe a nada...",
        weak: "¡Me siento débil...",
        win: "¡GANASTE!",
        lose: "PERDISTE...",
        draw: "EMPATE",
        needEgg: "Primero eclosiona tu huevo.",
        sureReset: "⚠️ ¿ESTÁS SEGURO?\n\nEsto borrará TODO tu progreso (Criatura, PC, Inventario) y no se puede deshacer.\n\n¿Quieres reiniciar?",
        hatch: "🐣 ECLOSIONAR",
        resetBtn: "☠️ RESET",
        sleeping: "💤 DURMIENDO",
        fullBtn: "😋 LLENO",
        feed: "🍖 ALIMENTAR",
        hello: "¡Hola!",
        elements: {
            fuego: "FUEGO", agua: "AGUA", planta: "PLANTA", electrico: "ELECTRICO", normal: "NORMAL"
        },
        stats: { atk: "Fuerza", def: "Defensa", spd: "Velocidad" },
        tutorialContent: `
            <p><strong>🐣 Cuidado Básico:</strong> Alimenta a tu criatura 3 veces al día. Si no come, ¡morirá! Evoluciona al subir de nivel.</p>
            <p><strong>🧪 Laboratorio:</strong> Mezcla elementos para crear comida (sueros) o <strong>Huevos</strong> nuevos.</p>
            <p><strong>💾 Guardado:</strong> El botón de disquete guarda TODO tu progreso (criatura actual + PC + inventario). ¡Úsalo para respaldar!</p>
        `,
        labPlaceholder: "Pegar código de suero...",
        closeLab: "CERRAR LAB",
        trainTitle: "🏋️ Entrenamiento",
        trainDesc: "¡Juega Piedra, Papel o Tijera!",
        closeTrain: "CERRAR ENTRENAMIENTO"
    },
    en: {
        lab: "Laboratory",
        train: "Training",
        dex: "Chimera-Dex",
        export: "Export / Save",
        tutorial: "Guide / Tutorial",
        photo: "Photo",
        reset: "Reset",
        labTitle: "🧪 Chimera Lab",
        labDesc: "Mix elements to create serums.",
        serum: "⚗️ SERUM",
        storage: "🎒 Storage",
        guideTitle: "📚 Game Guide",
        understood: "UNDERSTOOD!",
        dexTitle: "📖 Chimera-Dex",
        discoveries: "Discovered Recipes",
        closeDex: "CLOSE DEX",
        close: "CLOSE",
        full: "It's full! Can't eat more today.",
        invalidCode: "Invalid code",
        delicious: "Delicious!",
        yuck: "Yuck...",
        tasteless: "Tastes like nothing...",
        weak: "I feel weak...",
        win: "YOU WON!",
        lose: "YOU LOST...",
        draw: "DRAW",
        needEgg: "Hatch your egg first.",
        sureReset: "⚠️ ARE YOU SURE?\n\nThis will delete ALL your progress (Creature, PC, Inventory) and cannot be undone.\n\nDo you want to reset?",
        hatch: "🐣 HATCH",
        resetBtn: "☠️ RESET",
        sleeping: "💤 SLEEPING",
        fullBtn: "😋 FULL",
        feed: "🍖 FEED",
        hello: "Hello!",
        elements: {
            fuego: "FIRE", agua: "WATER", planta: "PLANT", electrico: "ELECTRIC", normal: "NORMAL"
        },
        stats: { atk: "Strength", def: "Defense", spd: "Speed" },
        tutorialContent: `
            <p><strong>🐣 Basic Care:</strong> Feed your creature 3 times a day. If it doesn't eat, it will die! It evolves by leveling up.</p>
            <p><strong>🧪 Laboratory:</strong> Mix elements to create food (serums) or new <strong>Eggs</strong>.</p>
            <p><strong>💾 Save:</strong> The floppy disk button saves ALL your progress (current creature + PC + inventory). Use it to backup!</p>
        `,
        labPlaceholder: "Paste serum code...",
        closeLab: "CLOSE LAB",
        trainTitle: "🏋️ Training",
        trainDesc: "Play Rock, Paper, Scissors!",
        closeTrain: "CLOSE TRAINING"
    }
};

var currentLang = localStorage.getItem('devicemon_lang');
if (!currentLang || !translations[currentLang]) {
    currentLang = 'es';
}

function changeLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('devicemon_lang', lang);
    
    // Actualizar selector si no coincide
    const sel = document.getElementById('lang-select');
    if(sel && sel.value !== lang) sel.value = lang;

    const t = translations[lang];

    // Tooltips
    if(document.getElementById('btn-lab')) document.getElementById('btn-lab').setAttribute('data-tooltip', t.lab);
    if(document.getElementById('btn-train')) document.getElementById('btn-train').setAttribute('data-tooltip', t.train);
    if(document.getElementById('btn-dex')) document.getElementById('btn-dex').setAttribute('data-tooltip', t.dex);
    if(document.getElementById('btn-export')) document.getElementById('btn-export').setAttribute('data-tooltip', t.export);
    if(document.getElementById('btn-tutorial')) document.getElementById('btn-tutorial').setAttribute('data-tooltip', t.tutorial);
    if(document.getElementById('btn-photo')) document.getElementById('btn-photo').setAttribute('data-tooltip', t.photo);
    if(document.getElementById('btn-reset')) document.getElementById('btn-reset').setAttribute('data-tooltip', t.reset);

    // Modals
    const labTitle = document.querySelector('#lab-modal h2');
    if(labTitle) labTitle.innerText = t.labTitle;
    const labDesc = document.querySelector('#lab-modal p');
    if(labDesc) labDesc.innerText = t.labDesc;
    const labBtn = document.querySelector('#lab-modal .action-btn');
    if(labBtn) labBtn.innerText = t.serum;
    
    const tutTitle = document.querySelector('#tutorial-modal h2');
    if(tutTitle) tutTitle.innerText = t.guideTitle;
    const tutBtn = document.getElementById('btn-close-tutorial');
    if(tutBtn) tutBtn.innerText = t.understood;

    const dexTitle = document.querySelector('#dex-modal h2');
    if(dexTitle) dexTitle.innerText = t.dexTitle;
    
    const dexBtn = document.getElementById('btn-close-dex');
    if(dexBtn) dexBtn.innerText = t.closeDex;

    const genBtn = document.getElementById('btn-close-generic');
    if(genBtn) genBtn.innerText = t.close;

    // Stats
    if(document.getElementById('lbl-atk')) document.getElementById('lbl-atk').innerText = t.stats.atk;
    if(document.getElementById('lbl-def')) document.getElementById('lbl-def').innerText = t.stats.def;
    if(document.getElementById('lbl-spd')) document.getElementById('lbl-spd').innerText = t.stats.spd;

    // Tutorial Content
    if(document.getElementById('tutorial-content')) document.getElementById('tutorial-content').innerHTML = t.tutorialContent;

    // Lab
    if(document.getElementById('food-import-input')) document.getElementById('food-import-input').placeholder = t.labPlaceholder;
    if(document.getElementById('btn-close-lab')) document.getElementById('btn-close-lab').innerText = t.closeLab;

    // Training
    if(document.getElementById('train-title')) document.getElementById('train-title').innerText = t.trainTitle;
    if(document.getElementById('train-desc')) document.getElementById('train-desc').innerText = t.trainDesc;
    if(document.getElementById('btn-close-training')) document.getElementById('btn-close-training').innerText = t.closeTrain;

    updateUI();
}

// Captura de errores global
window.onerror = function(msg, url, line) {
    alert("Error: " + msg + "\nLínea: " + line);
};

// Esperar a que cargue todo
window.addEventListener('load', init);

function init() {
    // Verificación crítica de librería
    if (typeof THREE === 'undefined') {
        const msg = "⚠️ Error Crítico: No se pudo cargar el motor 3D (Three.js).\n\n1. Asegúrate de que el archivo 'three.min.js' esté en la misma carpeta que este HTML.\n2. Verifica que el nombre del archivo sea correcto.";
        alert(msg);
        document.body.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;height:100vh;color:white;text-align:center;font-family:sans-serif"><div><h1>Error de Carga</h1><p>No se encontró el archivo 'three.min.js'</p></div></div>`;
        return;
    }

    try {
        const saved = localStorage.getItem(STATE_KEY);
        if (saved) {
            state = JSON.parse(saved);
            if(!state.level) state.level = 1;
            if(!state.inventory) state.inventory = [];
            if(!state.discoveries) state.discoveries = [];
        }
        
        if(!state.tutorialSeen) {
            setTimeout(showTutorial, 1000);
        }

        checkDailyReset();
        updateEnvironment();
        changeLanguage(currentLang);

        // Inicializar estado de sueño previo
        window.lastSleepState = isAsleep();
        // Chequeo periódico de horario
        setInterval(() => {
            updateEnvironment();
            if(state.born && !state.dead) {
                const currentSleep = isAsleep();
                if (currentSleep !== window.lastSleepState) {
                    window.lastSleepState = currentSleep;
                    generateCreatureVisuals();
                    updateUI();
                    if(currentSleep && isNightTime()) say("Zzz... (Hora de dormir)");
                    else if(!currentSleep) say("¡Buenos días!");
                }
            }
        }, 10000);

        setup3D();
        animate();
        updateUI();
        
        // Event listener para cerrar PC
        const closePCBtn = document.getElementById('close-storage-btn');
        if(closePCBtn) {
            closePCBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeStorage();
            });
        }
        
        // Prevenir submit con Enter en todos los inputs
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                e.preventDefault();
                return false;
            }
        });
        
        window.addEventListener('resize', onResize);
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
    } catch (e) {
        alert("Error al iniciar: " + e.message);
        console.error(e);
    }
}

function setup3D() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 100);
    camera.position.set(0, 2.5, 7);
    camera.lookAt(0, 0, 0);
    
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    const amb = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(5, 10, 5);
    dir.castShadow = true;
    scene.add(dir);

    // Suelo
    const plane = new THREE.Mesh(new THREE.CylinderGeometry(3,3,0.1,32), new THREE.MeshStandardMaterial({color:0xffffff, opacity:0.1, transparent:true}));
    plane.position.y = -1.5;
    plane.receiveShadow = true;
    scene.add(plane);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    if(!state.born) createEgg();
    else generateCreatureVisuals();
}

// --- GENERACIÓN EVOLUTIVA ---
function generateCreatureVisuals() {
    if(creatureGroup) scene.remove(creatureGroup);
    creatureGroup = new THREE.Group();
    
    // Escala basada en Nivel
    const scaleFactor = 0.8 + (state.level * 0.05);
    creatureGroup.scale.setScalar(scaleFactor);
    creatureGroup.position.y = 0.8 + (state.level * 0.1);

    // Colores
    const cols = {
        fuego: 0xff4757, agua: 0x1e90ff, planta: 0x2ed573, electrico: 0xffa502
    }[state.element] || 0xaaaaaa;

    // Material Toon (Cel Shading) para estilo Anime/Pokémon
    // Usamos una textura de gradiente simple
    let gradientMap;
    try {
        gradientMap = new THREE.DataTexture(
            new Uint8Array([0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 255]), // 3 tonos
            3, 1, 
            THREE.RGBAFormat
        );
        gradientMap.needsUpdate = true;
        gradientMap.minFilter = THREE.NearestFilter;
        gradientMap.magFilter = THREE.NearestFilter;
    } catch(e) {
        console.warn("No se pudo crear gradientMap", e);
    }

    const matBody = new THREE.MeshToonMaterial({ 
        color: cols, 
        gradientMap: gradientMap 
    });
    
    // Color secundario
    const colSec = new THREE.Color(cols).offsetHSL(0, 0, -0.15);
    const matSec = new THREE.MeshToonMaterial({ 
        color: colSec, 
        gradientMap: gradientMap 
    });
    
    const matWhite = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: gradientMap });
    const matDark = new THREE.MeshToonMaterial({ color: 0x333333 });

    // --- CONSTRUCCIÓN DEL CUERPO ---
    const bodyGroup = new THREE.Group();
    creatureGroup.add(bodyGroup);

    // 1. Cuerpo Principal
    let mainGeo;
    const bt = state.features.bodyType;
    
    // Formas base más orgánicas
    if (bt === 'box') mainGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    else if (bt === 'capsule') {
        // Fallback si CapsuleGeometry no existe (aunque en r150 debería estar)
        if (typeof THREE.CapsuleGeometry !== 'undefined') {
            mainGeo = new THREE.CapsuleGeometry(0.45, 0.8, 4, 16);
        } else {
            mainGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.2, 16);
        }
    }
    else if (bt === 'crystal') mainGeo = new THREE.IcosahedronGeometry(0.6, 0);
    else mainGeo = new THREE.SphereGeometry(0.6, 32, 32);

    const body = new THREE.Mesh(mainGeo, matBody);
    body.castShadow = true;
    bodyGroup.add(body);

    // 2. Cabeza y Cara
    let head = body; // Por defecto la cabeza es el cuerpo (tipo slime/kirby)
    let headOffset = 0;

    // Si es nivel > 5, separamos la cabeza para dar forma humanoide/animal
    if (state.level >= 5) {
        const headGeo = new THREE.SphereGeometry(0.4, 32, 32);
        head = new THREE.Mesh(headGeo, matBody);
        headOffset = 0.6;
        if(bt === 'capsule') headOffset = 0.8;
        
        head.position.y = headOffset;
        bodyGroup.add(head);
    }

    addFace(head, matWhite, matDark);

    // 3. Extremidades (Brazos y Piernas)
    addLimbs(bodyGroup, matBody, matSec, headOffset);

    // 4. Accesorios (Alas, Cuernos, Cola)
    addAccessories(head, bodyGroup, matSec, matWhite);

    scene.add(creatureGroup);
}

function addFace(parent, matSclera, matPupil) {
    const isSleeping = isAsleep();
    const faceGroup = new THREE.Group();
    // Posicionar la cara al frente
    faceGroup.position.z = 0.35; 
    if(state.level >= 5) faceGroup.position.z = 0.38; // Ajuste para cabeza separada

    if (isSleeping) {
            // Ojos cerrados (dormido) - Líneas curvas
            const eyeGeo = new THREE.TorusGeometry(0.08, 0.02, 2, 8, Math.PI);
            const eL = new THREE.Mesh(eyeGeo, matPupil); 
            eL.position.set(-0.15, 0.05, 0); eL.rotation.z = Math.PI;
            const eR = new THREE.Mesh(eyeGeo, matPupil); 
            eR.position.set(0.15, 0.05, 0); eR.rotation.z = Math.PI;
            faceGroup.add(eL, eR);
    } else {
        // Ojos abiertos estilo Anime
        const eyeSize = state.features.eyeType === 'cyclops' ? 0.25 : 0.12;
        const scleraGeo = new THREE.SphereGeometry(eyeSize, 16, 16);
        const pupilGeo = new THREE.SphereGeometry(eyeSize * 0.4, 16, 16);
        
        if(state.features.eyeType === 'cyclops') {
            const s = new THREE.Mesh(scleraGeo, matSclera);
            s.scale.set(1, 1, 0.3);
            const p = new THREE.Mesh(pupilGeo, matPupil);
            p.position.z = eyeSize * 0.8;
            s.add(p);
            s.position.set(0, 0.1, 0);
            faceGroup.add(s);
        } else {
            // Ojo Izquierdo
            const sL = new THREE.Mesh(scleraGeo, matSclera);
            sL.scale.set(1, 1.2, 0.3);
            sL.position.set(-0.18, 0.05, 0);
            const pL = new THREE.Mesh(pupilGeo, matPupil);
            pL.position.z = eyeSize * 0.9;
            sL.add(pL);

            // Ojo Derecho
            const sR = sL.clone();
            sR.position.set(0.18, 0.05, 0);
            
            faceGroup.add(sL, sR);
        }
    }

    // Boca pequeña
    if(!isSleeping) {
        const mouthGeo = new THREE.TorusGeometry(0.05, 0.02, 2, 8, Math.PI);
        const mouth = new THREE.Mesh(mouthGeo, matPupil);
        mouth.position.set(0, -0.15, 0);
        faceGroup.add(mouth);
    }

    parent.add(faceGroup);
}

function addLimbs(parent, matPrimary, matSecondary, headOffset) {
    // Geometría de extremidad (patita redondeada)
    const limbGeo = new THREE.SphereGeometry(0.15, 16, 16);
    
    // Piernas (siempre presentes)
    const legL = new THREE.Mesh(limbGeo, matSecondary);
    legL.position.set(-0.3, -0.5, 0);
    legL.scale.y = 1.5;
    
    const legR = legL.clone();
    legR.position.set(0.3, -0.5, 0);
    
    parent.add(legL, legR);

    // Brazos (solo si nivel > 2)
    if(state.level > 2) {
        let armGeo;
        if (typeof THREE.CapsuleGeometry !== 'undefined') {
            armGeo = new THREE.CapsuleGeometry(0.1, 0.3, 4, 8);
        } else {
            armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8);
        }
        
        const armL = new THREE.Mesh(armGeo, matPrimary);
        armL.position.set(-0.55, 0, 0); 
        armL.rotation.z = Math.PI / 4;
        
        const armR = new THREE.Mesh(armGeo, matPrimary);
        armR.position.set(0.55, 0, 0); 
        armR.rotation.z = -Math.PI / 4;
        
        parent.add(armL, armR);
    }
}

function addAccessories(head, body, matColor, matWhite) {
    // Cuernos (en la cabeza)
    if(state.features.hasHorns) {
        const hGeo = new THREE.ConeGeometry(0.06, 0.3, 8);
        const hL = new THREE.Mesh(hGeo, matWhite);
        hL.position.set(-0.2, 0.35, 0); hL.rotation.z = 0.3;
        const hR = new THREE.Mesh(hGeo, matWhite);
        hR.position.set(0.2, 0.35, 0); hR.rotation.z = -0.3;
        head.add(hL, hR);
    }
    
    // Alas (en el cuerpo)
    if(state.features.hasWings) {
        const wShape = new THREE.Shape();
        wShape.moveTo(0,0);
        wShape.quadraticCurveTo(0.5, 0.5, 1, 1);
        wShape.quadraticCurveTo(0.5, 0, 0.2, -0.5);
        wShape.lineTo(0,0);
        
        const wGeo = new THREE.ExtrudeGeometry(wShape, { depth: 0.05, bevelEnabled: false });
        const wL = new THREE.Mesh(wGeo, matColor);
        wL.position.set(-0.3, 0.2, -0.3); 
        wL.rotation.y = -0.5; wL.scale.set(-0.8, 0.8, 0.8); // Espejo
        
        const wR = new THREE.Mesh(wGeo, matColor);
        wR.position.set(0.3, 0.2, -0.3); 
        wR.rotation.y = 0.5; wR.scale.set(0.8, 0.8, 0.8);
        
        body.add(wL, wR);
    }

    // Cola (en el cuerpo, da mucho estilo Pokémon)
    const tGeo = new THREE.ConeGeometry(0.15, 0.5, 8);
    const tail = new THREE.Mesh(tGeo, matColor);
    tail.position.set(0, -0.3, -0.5);
    tail.rotation.x = -1.2;
    body.add(tail);
}

function createEgg() {
    if(creatureGroup) scene.remove(creatureGroup);
    creatureGroup = new THREE.Group();
    creatureGroup.position.y = 0.8;
    const egg = new THREE.Mesh(
        new THREE.SphereGeometry(1, 32, 32), 
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
    );
    egg.scale.y = 1.3;
    creatureGroup.add(egg);
    scene.add(creatureGroup);
}

// --- SISTEMA DE VIDA Y EVOLUCIÓN ---
function hatch() {
    const newMon = generateCreatureData();
    
    // Mantener propiedades globales
    const globalProps = {
        inventory: state.inventory,
        discoveries: state.discoveries,
        wins: state.wins,
        losses: state.losses,
        storage: state.storage,
        maxStorage: state.maxStorage,
        tutorialSeen: state.tutorialSeen
    };

    state = { ...newMon, ...globalProps };

    generateCreatureVisuals();
    updateUI();
    save();
    spawnParticles(0xffd700, 50);
    say("¡Hola mundo!");
}

function evolve() {
    state.level++;
    
    // Mejora de stats
    state.stats.atk += Math.floor(Math.random()*5);
    state.stats.def += Math.floor(Math.random()*5);
    
    // Feedback visual
    generateCreatureVisuals();
    
    // Efectos especiales
    spawnParticles(0x00ffff, 30);
    
    let msg = "¡Subí de nivel!";
    if(state.level === 5) msg = "¡Estoy cambiando!";
    if(state.level === 10) msg = "¡He evolucionado!";

    // Desbloqueo de almacenamiento
    if(state.level === 20 && state.maxStorage < 20) {
        state.maxStorage = 20;
        msg = "¡PC Ampliado a 20!";
        alert("¡Felicidades! Has alcanzado el nivel 20.\nTu capacidad de almacenamiento ha aumentado a 20 espacios.");
    }

    say(msg);
}

function handleMain() {
    if(state.dead) {
        if(confirm("¿Reiniciar?")) { localStorage.removeItem(STATE_KEY); location.reload(); }
        return;
    }

    if(!state.born) {
        hatch();
    } else {
        // Bloqueo por horario nocturno
        if (isNightTime()) {
            say("Zzz... (Es muy tarde)");
            return;
        }

        // Lógica de comida limitada
        if(state.meals < 3) {
            state.meals++;
            state.totalMeals++;
            state.lastDay = new Date().toDateString();
            
            // Animación comer
            creatureGroup.scale.multiplyScalar(1.2);
            setTimeout(()=>generateCreatureVisuals(), 200); // Reset escala correcta
            spawnParticles(0xff6b81, 10); // Corazones/comida
            
            // Chequeo de evolución (Cada 3 comidas totales sube nivel, o cada vez que se llene el dia)
            // Aquí: Si completa las 3 comidas del día -> Sube nivel
            if(state.meals === 3) {
                setTimeout(evolve, 500);
            } else {
                const phrases = ["¡Ñam!", "¡Rico!", "¡Más!"];
                say(phrases[Math.floor(Math.random()*phrases.length)]);
            }
            
            save();
            updateUI();
        } else {
            say("¡Estoy lleno! (Vuelve mañana)");
        }
    }
}

// --- UTILS DE SISTEMA ---
function checkDailyReset() {
    if(state.lastDay !== new Date().toDateString()) {
        state.meals = 0; // Nuevo día, panza vacía
        state.lastDay = new Date().toDateString();
        save();
    }
}

function say(text) {
    const b = document.getElementById('bubble');
    b.innerText = text;
    b.classList.add('show');
    setTimeout(() => b.classList.remove('show'), 3000);
}

// --- INTERACCIÓN ---
function onPointerDown(e) {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    // No interactuar si hay un modal abierto
    const modals = document.querySelectorAll('.modal.open');
    if (modals.length > 0) return;
    
    isDragging = true;
    previousMouseX = e.clientX;
    
    // Click Check
    if (!creatureGroup) return;
    
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(creatureGroup.children, true);
    
    if (intersects.length > 0 && state.born) {
        document.getElementById('stats-card').classList.add('visible');
        say(state.name);
        // Pequeño salto de alegría
        creatureGroup.position.y += 0.5;
    } else {
        document.getElementById('stats-card').classList.remove('visible');
    }
}
function onPointerMove(e) {
    // Actualizar mouse para "look at"
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if(isDragging && creatureGroup) {
        const delta = e.clientX - previousMouseX;
        creatureGroup.rotation.y += delta * 0.01;
        previousMouseX = e.clientX;
    }
}
function onPointerUp() { isDragging = false; }

// --- SISTEMA DE ID / IMPORT / EXPORT ---
// (Movido a buttons.js)


// --- FOTO / COMPARTIR ---
// (Movido a buttons.js)


// --- UI & HELPERS ---
function spawnParticles(color, count) {
    for(let i=0; i<count; i++) {
        const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const mat = new THREE.MeshBasicMaterial({color: color});
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(creatureGroup.position);
        mesh.position.x += (Math.random()-0.5);
        mesh.userData = { vel: new THREE.Vector3((Math.random()-0.5)*0.2, Math.random()*0.2, (Math.random()-0.5)*0.2) };
        scene.add(mesh);
        particles.push(mesh);
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    if (creatureGroup && !state.dead && state.born) {
        const isSleeping = isAsleep();
        
        // Flotar suave
        creatureGroup.position.y = (0.8 + (state.level*0.1)) + Math.sin(Date.now()*0.002) * 0.1;

        if (isSleeping) {
            // Animación de dormir
            creatureGroup.rotation.x = THREE.MathUtils.lerp(creatureGroup.rotation.x, 0.2, 0.05);
            creatureGroup.rotation.y = THREE.MathUtils.lerp(creatureGroup.rotation.y, 0, 0.05);
            
            // Generar Zzz
            if (Math.random() < 0.01) spawnZzz();
        } else if (!isDragging) {
            // Mirar al mouse suavemente
            const targetX = -mouse.y * 0.3;
            const targetY = mouse.x * 0.5;
            creatureGroup.rotation.x = THREE.MathUtils.lerp(creatureGroup.rotation.x, targetX, 0.05);
            creatureGroup.rotation.y = THREE.MathUtils.lerp(creatureGroup.rotation.y, targetY, 0.05);
        }
    }

    // Partículas
    for(let i=particles.length-1; i>=0; i--) {
        let p = particles[i];
        p.position.add(p.userData.vel);
        
        if (p.userData.isText) {
            // Comportamiento especial para texto (Zzz)
            p.position.y += 0.01;
            p.material.opacity -= 0.01;
            if(p.material.opacity <= 0) { scene.remove(p); particles.splice(i, 1); }
        } else {
            // Partículas normales
            p.scale.multiplyScalar(0.9);
            if(p.scale.x < 0.01) { scene.remove(p); particles.splice(i, 1); }
        }
    }
    renderer.render(scene, camera);
}

function spawnZzz() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('Z', 10, 50);
    
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    
    sprite.position.copy(creatureGroup.position);
    sprite.position.y += 1.5;
    sprite.position.x += (Math.random() - 0.5) * 0.5;
    sprite.scale.set(0.5, 0.5, 0.5);
    
    sprite.userData = { vel: new THREE.Vector3(0.01, 0.02, 0), isText: true };
    scene.add(sprite);
    particles.push(sprite);
}

function updateUI() {
    const t = translations[currentLang];

    document.getElementById('hunger-txt').innerText = `${state.meals}/3`;
    document.getElementById('level-txt').innerText = `LVL ${state.level}`;
    const btn = document.getElementById('main-btn');
    
    if(state.dead) {
        btn.innerText = t.resetBtn; btn.style.background = "#555";
    } else if(!state.born) {
        btn.innerText = t.hatch;
    } else {
        if (isNightTime()) {
            btn.innerText = t.sleeping;
            btn.style.background = "#2f3640";
            btn.style.boxShadow = "0 8px 0 #1e272e";
        } else {
            // Si es de día, mostramos si está lleno o puede comer
            btn.innerText = state.meals >= 3 ? t.fullBtn : t.feed;
            if(state.meals >= 3) {
                btn.style.background = "#a4b0be";
                btn.style.boxShadow = "0 8px 0 #7f8fa6";
            }
            else {
                btn.style.background = "#ff6b81";
                btn.style.boxShadow = "0 8px 0 #c44569";
            }
        }
    }

    // Info card
    document.getElementById('mon-name').innerText = state.name;
    document.getElementById('dna-preview').innerText = `ID: ${state.dnaId || '---'}`;
    document.getElementById('bar-atk').style.width = Math.min(100, state.stats.atk) + '%';
    document.getElementById('bar-def').style.width = Math.min(100, state.stats.def) + '%';
    document.getElementById('bar-spd').style.width = Math.min(100, state.stats.spd) + '%';
    const badge = document.getElementById('mon-type');
    badge.className = `element-badge type-${state.element}`;
    badge.innerText = t.elements[state.element] || state.element.toUpperCase();

    // Update dynamic text in modals
    const invCount = document.getElementById('inv-count');
    if(invCount && invCount.parentElement) {
         invCount.parentElement.innerHTML = `${t.storage} (<span id="inv-count">${state.inventory.length}</span>/10)`;
    }
    
    const dexCount = document.getElementById('dex-count');
    if(dexCount && dexCount.parentElement) {
        dexCount.parentElement.innerHTML = `${t.discoveries}: <span id="dex-count">${state.discoveries.length}</span>`;
    }
}

function closeModal() { 
    document.getElementById('generic-modal').classList.remove('open'); 
}
function save() { localStorage.setItem(STATE_KEY, JSON.stringify(state)); }
function onResize() {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- LÓGICA DEL LABORATORIO ---
// (Movido a buttons.js)




// --- NUEVAS FUNCIONES (CLIMA, MINIJUEGO) ---
function updateEnvironment() {
    const h = new Date().getHours();
    const body = document.body;
    const layer = document.getElementById('weather-layer');
    
    // Ciclo Día/Noche
    if(h >= 6 && h < 12) body.style.background = "linear-gradient(to bottom, #87CEEB, #E0F7FA)"; // Mañana
    else if(h >= 12 && h < 18) body.style.background = "linear-gradient(to bottom, #4facfe, #00f2fe)"; // Día
    else if(h >= 18 && h < 21) body.style.background = "linear-gradient(to bottom, #fa709a, #fee140)"; // Atardecer
    else body.style.background = "radial-gradient(circle at 50% 100%, #0f2027, #203a43, #2c5364)"; // Noche

    // Clima Aleatorio (10% chance de lluvia)
    if(!window.weatherState || Math.random() > 0.95) {
        window.weatherState = Math.random() > 0.8 ? 'rain' : 'clear';
    }

    layer.innerHTML = '';
    if(window.weatherState === 'rain') {
        for(let i=0; i<20; i++) {
            const drop = document.createElement('div');
            drop.className = 'rain-drop';
            drop.style.left = Math.random()*100 + '%';
            drop.style.animationDuration = (0.5 + Math.random()*0.5) + 's';
            drop.style.animationDelay = Math.random() + 's';
            layer.appendChild(drop);
        }
    }
}

// --- ENTRENAMIENTO ---
// (Movido a buttons.js)


// --- COLISEO ---
// (Movido a buttons.js)


// --- QUIMERA-DEX ---
// (Movido a buttons.js)


// --- SISTEMA DE ALMACENAMIENTO (PC) ---
// (Movido a buttons.js)


// --- CREACIÓN DE HUEVOS ---
// (createEggFromLab movido a buttons.js)


function generateCreatureData(forceElement = null) {
    const rand = () => Math.random();
    const element = forceElement || ELEMENTS[Math.floor(rand() * ELEMENTS.length)];
    
    const features = {
        bodyType: rand()>0.7 ? 'crystal' : (rand()>0.5 ? 'box' : 'capsule'),
        eyeType: rand()>0.8 ? 'cyclops' : 'normal',
        hasWings: rand()>0.5,
        hasHorns: rand()>0.5
    };
    if(rand() > 0.95) features.bodyType = 'mutant';

    const atk = Math.floor(20 + rand()*30);
    const spd = Math.floor(20 + rand()*30);
    const def = 100 - Math.floor((atk+spd)/2);

    const pre = ["Neo", "Xeno", "Proto", "Hyper", "Omne", "Flux", "Aero", "Terra", "Hydro", "Pyro"];
    const suf = ["mon", "ite", "os", "ian", "yr", "rex", "zor"];
    const name = pre[Math.floor(rand()*pre.length)] + suf[Math.floor(rand()*suf.length)];
    const dnaId = Math.random().toString(36).substring(2, 8).toUpperCase();

    return {
        born: true, // Ya nace como criatura nivel 1 para simplificar
        name: name,
        element: element,
        level: 1,
        stats: { atk, def, spd },
        features: features,
        meals: 0,
        totalMeals: 0,
        lastDay: new Date().toDateString(),
        dnaId: dnaId,
        dead: false
    };
}

// --- TUTORIAL ---
// (Movido a buttons.js)
