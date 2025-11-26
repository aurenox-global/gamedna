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
    wins: 0, losses: 0, // Récord de batallas
    dead: false,
    storage: [], // PC de criaturas
    maxStorage: 5,
    tutorialSeen: false
};

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
            if(!state.wins) state.wins = 0;
            if(!state.losses) state.losses = 0;
            if(!state.storage) state.storage = [];
            if(!state.maxStorage) state.maxStorage = 5;
            // Fix legacy saves
            if(state.level >= 20 && state.maxStorage < 20) state.maxStorage = 20;
        }
        
        if(!state.tutorialSeen) {
            setTimeout(showTutorial, 1000);
        }

        checkDailyReset();
        updateEnvironment();

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
        
        // Event listeners para cerrar modales al hacer clic en el fondo
        const modals = [
            { id: 'storage-modal', closeFunc: closeStorage },
            { id: 'tutorial-modal', closeFunc: closeTutorial },
            { id: 'lab-modal', closeFunc: closeLab },
            { id: 'training-modal', closeFunc: closeTraining },
            { id: 'coliseum-modal', closeFunc: closeColiseum },
            { id: 'dex-modal', closeFunc: closeDex },
            { id: 'generic-modal', closeFunc: closeModal }
        ];
        
        modals.forEach(modalInfo => {
            const modal = document.getElementById(modalInfo.id);
            if(modal) {
                modal.addEventListener('click', function(e) {
                    // Solo cerrar si se hace clic en el fondo (no en el contenido)
                    if(e.target === modal) {
                        modalInfo.closeFunc();
                    }
                });
            }
        });
        
        // Prevenir submit con Enter en todos los inputs
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                e.preventDefault();
                
                // Ejecutar acción específica según el input
                const inputId = e.target.id;
                if(inputId === 'storage-import-input') {
                    importToStorage();
                } else if(inputId === 'rival-input') {
                    startBattle('rival');
                } else if(inputId === 'food-import-input') {
                    importFood();
                }
                
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
function showExportDNA() {
    if(!state.born) return alert("Primero eclosiona tu huevo.");
    const modal = document.getElementById('generic-modal');
    document.getElementById('modal-title').innerText = "💾 Guardar Progreso";
    document.getElementById('modal-desc').innerText = "Este código contiene TODO tu juego (Criatura, PC, Inventario). Guárdalo en un lugar seguro.";
    
    // Generar Base64 del estado
    const dnaString = btoa(JSON.stringify(state));
    
    document.getElementById('modal-body').innerHTML = `
        <textarea readonly onclick="this.select()">${dnaString}</textarea>
        <button id="copy-save-btn" class="action-btn" style="width:100%; font-size:0.9rem">COPIAR SAVEGAME</button>
    `;
    
    // Agregar event listener al botón de copiar
    const copyBtn = document.getElementById('copy-save-btn');
    if(copyBtn) {
        copyBtn.onclick = function(e) {
            e.stopPropagation();
            navigator.clipboard.writeText(dnaString);
            alert('Copiado!');
        };
    }
    
    modal.classList.add('open');
}

function showImportDNA() {
    const modal = document.getElementById('generic-modal');
    document.getElementById('modal-title').innerText = "🧬 Importar DNA";
    document.getElementById('modal-desc').innerText = "Pega el código de otra criatura. ¡Cuidado, reemplazará la tuya!";
    
    document.getElementById('modal-body').innerHTML = `
        <textarea id="import-area" placeholder="Pega el código aquí..."></textarea>
        <button class="action-btn" style="width:100%; background:#54a0ff; color:white; font-size:0.9rem" onclick="processImport()">IMPORTAR</button>
    `;
    modal.classList.add('open');
}

function processImport() {
    try {
        const code = document.getElementById('import-area').value;
        if(!code) return;
        const newState = JSON.parse(atob(code));
        
        // Validar estructura básica
        if(!newState.name || !newState.stats) throw new Error("DNA Inválido");
        
        state = newState;
        save();
        generateCreatureVisuals();
        updateUI();
        closeModal();
        spawnParticles(0x54a0ff, 50);
        say("¡Transformación completa!");
    } catch(e) {
        alert("Error: El código DNA no es válido.");
    }
}

// --- FOTO / COMPARTIR ---
async function sharePhoto() {
    renderer.render(scene, camera);
    renderer.domElement.toBlob(async blob => {
        const file = new File([blob], "devicemon_evo.png", {type:"image/png"});
        if(navigator.share && navigator.canShare({files:[file]})) {
            navigator.share({files:[file], title: state.name, text: `¡Mira mi ${state.name} Nivel ${state.level}!`});
        } else {
            const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download="mon.png"; a.click();
        }
    });
}

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
    document.getElementById('hunger-txt').innerText = `${state.meals}/3`;
    document.getElementById('level-txt').innerText = `LVL ${state.level}`;
    const btn = document.getElementById('main-btn');
    
    if(state.dead) {
        btn.innerText = "☠️ RESET"; btn.style.background = "#555";
    } else if(!state.born) {
        btn.innerText = "🐣 ECLOSIONAR";
    } else {
        if (isNightTime()) {
            btn.innerText = "💤 DURMIENDO";
            btn.style.background = "#2f3640";
            btn.style.boxShadow = "0 8px 0 #1e272e";
        } else {
            // Si es de día, mostramos si está lleno o puede comer
            btn.innerText = state.meals >= 3 ? "😋 LLENO" : "🍖 ALIMENTAR";
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
    badge.innerText = state.element;
}

function closeModal(e) {
    if(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    document.getElementById('generic-modal').classList.remove('open'); 
}
function save() { localStorage.setItem(STATE_KEY, JSON.stringify(state)); }
function onResize() {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- LÓGICA DEL LABORATORIO ---
function showLab() {
    if(!state.born) return alert("Primero eclosiona tu huevo.");
    const modal = document.getElementById('lab-modal');
    const grid = document.getElementById('periodic-table');
    grid.innerHTML = '';
    selectedChems = [];
    updateLabSlots();
    renderInventory(); // Mostrar inventario

    CHEMICALS.forEach(chem => {
        const btn = document.createElement('div');
        btn.className = 'chem-btn';
        btn.innerText = chem.sym;
        btn.style.borderColor = chem.color;
        btn.onclick = () => toggleChem(chem, btn);
        grid.appendChild(btn);
    });

    modal.classList.add('open');
}

function renderInventory() {
    const list = document.getElementById('inv-list');
    const count = document.getElementById('inv-count');
    list.innerHTML = '';
    count.innerText = state.inventory.length;

    if(state.inventory.length === 0) {
        list.innerHTML = '<p style="font-size:0.8rem; color:#999; text-align:center; width:100%">Vacío</p>';
        return;
    }

    state.inventory.forEach((item, idx) => {
        const row = document.createElement('div');
        row.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:white; padding:5px 10px; border-radius:5px; font-size:0.8rem; border:1px solid #eee";
        row.innerHTML = `
            <span style="font-weight:bold; color:#555">${item.comp.join('-')} <span style="font-weight:normal; color:#aaa">(${item.power}%)</span></span>
            <div style="display:flex; gap:5px">
                <button onclick="useInventoryItem(${idx})" style="border:none; background:#a29bfe; color:white; border-radius:4px; cursor:pointer; padding:2px 6px">🍽️</button>
                <button onclick="deleteInventoryItem(${idx})" style="border:none; background:#ff7675; color:white; border-radius:4px; cursor:pointer; padding:2px 6px">🗑️</button>
            </div>
        `;
        list.appendChild(row);
    });
}

function useInventoryItem(idx) {
    if(state.meals >= 3) return alert("¡Está lleno! No puede comer más hoy.");
    const item = state.inventory[idx];
    const foodId = btoa(JSON.stringify(item));
    
    // Consumir y borrar si fue exitoso (consumeFood cierra modales, así que asumimos éxito si no lanza error)
    consumeFood(foodId);
    state.inventory.splice(idx, 1);
    save();
}

function deleteInventoryItem(idx) {
    if(confirm("¿Borrar este suero?")) {
        state.inventory.splice(idx, 1);
        save();
        renderInventory();
    }
}

function closeLab(e) {
    if(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    document.getElementById('lab-modal').classList.remove('open');
}

function toggleChem(chem, btn) {
    const idx = selectedChems.indexOf(chem);
    if(idx > -1) {
        selectedChems.splice(idx, 1);
        btn.classList.remove('selected');
    } else {
        if(selectedChems.length >= 3) return;
        selectedChems.push(chem);
        btn.classList.add('selected');
    }
    updateLabSlots();
}

function updateLabSlots() {
    const container = document.getElementById('lab-slots-container');
    container.innerHTML = '';
    for(let i=0; i<3; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot ' + (selectedChems[i] ? 'filled' : '');
        if(selectedChems[i]) {
            slot.innerText = selectedChems[i].sym;
            slot.style.backgroundColor = selectedChems[i].color;
        }
        container.appendChild(slot);
    }
}

function mixChemicals(type) {
    if(selectedChems.length === 0) return alert("Selecciona al menos 1 elemento.");
    
    // Si es huevo, llamar a función específica
    if(type === 'egg') {
        createEggFromLab();
        return;
    }
    
    // Crear objeto de comida
    const foodData = {
        type: 'lab_food',
        comp: selectedChems.map(c => c.sym),
        power: Math.floor(Math.random() * 100)
    };
    
    // Registrar en Dex (ordenado para consistencia)
    const sortedComp = [...foodData.comp].sort();
    const compStr = sortedComp.join('+');
    const exists = state.discoveries.find(d => d.comp.join('+') === compStr);
    
    if(!exists) {
        state.discoveries.push({
            comp: sortedComp,
            effect: "Efecto desconocido", // Se revelará al comer
            date: new Date().toDateString()
        });
        save();
    }

    // Generar ID
    const foodId = btoa(JSON.stringify(foodData));
    
    // Mostrar resultado
    closeLab();
    const modal = document.getElementById('generic-modal');
    document.getElementById('modal-title').innerText = exists ? "🧪 Suero Sintetizado" : "✨ ¡NUEVO DESCUBRIMIENTO!";
    document.getElementById('modal-desc').innerText = exists ? "Has creado un compuesto conocido." : "¡Has registrado una nueva fórmula!";
    document.getElementById('modal-body').innerHTML = `
        <div style="background:#f1f2f6; padding:15px; border-radius:10px; margin-bottom:10px">
            <h3 style="margin:0; color:#6c5ce7">${selectedChems.map(c=>c.sym).join('-')}</h3>
            <p style="font-size:0.8rem; color:#888">Potencia: ${foodData.power}%</p>
        </div>
        <p style="font-size:0.9rem">Copia este código para compartirlo:</p>
        <textarea readonly onclick="this.select()">${foodId}</textarea>
        <div style="display:flex; gap:10px; margin-top:10px">
            <button class="action-btn" style="flex:1; font-size:0.9rem; background:#dfe6e9" onclick="saveToInventory('${foodId}')">🎒 GUARDAR</button>
            <button class="action-btn" style="flex:1; background:#6c5ce7; color:white; font-size:0.9rem" onclick="tryConsume('${foodId}')">DAR A ${state.name.toUpperCase()}</button>
        </div>
    `;
    modal.classList.add('open');
}

function saveToInventory(foodId) {
    if(state.inventory.length >= 10) return alert("¡Almacén lleno! (Máx 10)");
    const food = JSON.parse(atob(foodId));
    state.inventory.push(food);
    save();
    alert("Guardado en el almacén.");
    closeModal();
}

function tryConsume(foodId) {
    if(state.meals >= 3) return alert("¡Está lleno! Guárdalo para mañana.");
    consumeFood(foodId);
}

function importFood() {
    // Verificar que el modal del lab esté abierto
    const labModal = document.getElementById('lab-modal');
    if(!labModal || !labModal.classList.contains('open')) {
        console.warn('importFood llamado sin modal abierto');
        return;
    }
    
    const input = document.getElementById('food-import-input');
    const code = input.value.trim();
    if(!code) return alert("Pega un código primero.");
    consumeFood(code);
    input.value = '';
    closeLab();
}

function consumeFood(base64Code) {
    try {
        // Verificación de saciedad
        if(state.meals >= 3) {
            alert("¡Está lleno! No puede comer más hoy.");
            return;
        }

        const food = JSON.parse(atob(base64Code));
        if(food.type !== 'lab_food') throw new Error("Código inválido");
        
        closeModal(); // Cerrar cualquier modal abierto
        
        // Calcular efectos
        let effect = 0; // Positivo o negativo
        let msg = "";
        
        // Lógica de afinidad elemental
        const el = state.element;
        const comp = food.comp;
        
        // Reglas básicas
        if(comp.includes('U')) {
            // Uranio: Riesgo alto
            if(Math.random() > 0.5) { effect += 50; msg += "¡RADIACIÓN POSITIVA! "; }
            else { effect -= 50; msg += "¡RADIACIÓN NOCIVA! "; }
        }
        
        if(comp.includes('Au')) {
            if(el === 'electrico') { effect += 30; msg += "¡Conductividad máxima! "; }
            else { effect += 5; msg += "Brillante... "; }
        }
        
        if(comp.includes('H') && comp.includes('O')) {
            if(el === 'agua') { effect += 25; msg += "¡Hidratación pura! "; }
            else if(el === 'fuego') { effect -= 20; msg += "¡Se apaga! "; }
        }
        
        if(comp.includes('C')) {
            if(el === 'fuego') { effect += 25; msg += "¡Combustible! "; }
            else if(el === 'planta') { effect += 20; msg += "¡Nutrientes! "; }
        }

        if(comp.includes('Fe')) {
            if(el === 'electrico') { effect += 20; }
            else if(el === 'agua') { effect -= 15; msg += "¡Oxidación! "; }
        }

        // Nuevos elementos
        if(comp.includes('Na') && comp.includes('Cl')) {
            effect += 10; msg += "¡Salado! ";
        }
        if(comp.includes('S')) {
            if(el === 'fuego') { effect += 30; msg += "¡Explosivo! "; }
            else { effect -= 10; msg += "Huele mal... "; }
        }
        if(comp.includes('K') && comp.includes('Mg')) {
            effect += 15; msg += "¡Vitaminas! ";
        }

        // Aplicar cambios
        if(effect > 0) {
            state.stats.atk += Math.ceil(effect * 0.5);
            state.stats.def += Math.ceil(effect * 0.5);
            state.stats.spd += Math.ceil(effect * 0.5);
            spawnParticles(0x00ff00, 30);
            say(msg || "¡Delicioso!");
            
            // Chance de evolucionar si el efecto es muy fuerte
            if(effect > 40) {
                setTimeout(evolve, 1000);
            }
        } else if (effect < 0) {
            state.stats.atk = Math.max(1, state.stats.atk + Math.ceil(effect * 0.2));
            state.stats.def = Math.max(1, state.stats.def + Math.ceil(effect * 0.2));
            state.stats.spd = Math.max(1, state.stats.spd + Math.ceil(effect * 0.2));
            
            // Chance de bajar de nivel
            if(effect < -30 && state.level > 1) {
                state.level--;
                msg += " ¡Me siento débil...";
                generateCreatureVisuals();
            }
            
            spawnParticles(0x555555, 30);
            say(msg || "Puaj...");
        } else {
            say("Sabe a nada...");
        }
        
        // Contar como comida
        state.meals++;
        state.totalMeals++;
        state.lastDay = new Date().toDateString();
        if(state.meals === 3) setTimeout(evolve, 500);

        save();
        updateUI();
        
    } catch(e) {
        alert("El código del suero no es válido o está corrupto.");
    }
}

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
function showTraining() {
    if(!state.born) return alert("Primero eclosiona tu huevo.");
    document.getElementById('training-modal').classList.add('open');
    document.getElementById('rps-result').innerText = "";
}

function playRPS(choice) {
    const opts = ['fuego', 'planta', 'agua'];
    const cpu = opts[Math.floor(Math.random()*3)];
    const resEl = document.getElementById('rps-result');
    
    let result = 'draw';
    if(choice === cpu) result = 'draw';
    else if(
        (choice === 'fuego' && cpu === 'planta') ||
        (choice === 'planta' && cpu === 'agua') ||
        (choice === 'agua' && cpu === 'fuego')
    ) result = 'win';
    else result = 'lose';

    const icons = {fuego:'🔥', planta:'🌿', agua:'💧'};
    
    if(result === 'win') {
        resEl.innerText = `Tú: ${icons[choice]} vs CPU: ${icons[cpu]} -> ¡GANASTE! (+XP)`;
        resEl.style.color = "#2ed573";
        state.stats.atk++; 
        spawnParticles(0x2ed573, 20);
        say("¡Sí! ¡Gané!");
    } else if(result === 'lose') {
        resEl.innerText = `Tú: ${icons[choice]} vs CPU: ${icons[cpu]} -> PERDISTE...`;
        resEl.style.color = "#ff4757";
        say("Auch...");
        creatureGroup.position.y -= 0.2; 
    } else {
        resEl.innerText = `Tú: ${icons[choice]} vs CPU: ${icons[cpu]} -> EMPATE`;
        resEl.style.color = "#ffa502";
    }
    save();
    updateUI();
}

// --- COLISEO ---
function showColiseum() {
    if(!state.born) return alert("Primero eclosiona tu huevo.");
    document.getElementById('coliseum-modal').classList.add('open');
}

function closeColiseum() {
    const modal = document.getElementById('coliseum-modal');
    if(modal) {
        modal.classList.remove('open');
    }
    // Limpiar input de rival
    const input = document.getElementById('rival-input');
    if(input) input.value = '';
}

function startBattle(type) {
    if(type === 'wild') {
        // Generar enemigo aleatorio
        const enemy = {
            name: 'Salvaje',
            element: ELEMENTS[Math.floor(Math.random()*ELEMENTS.length)],
            stats: {
                atk: Math.floor(state.stats.atk * (0.8 + Math.random()*0.4)),
                def: Math.floor(state.stats.def * (0.8 + Math.random()*0.4)),
                spd: Math.floor(state.stats.spd * (0.8 + Math.random()*0.4))
            }
        };
        battle(enemy);
    } else if(type === 'rival') {
        // Rival
        const input = document.getElementById('rival-input');
        if(!input) {
            console.error("No se encontró el input rival-input");
            return;
        }
        const code = input.value.trim();
        if(!code) return alert("Pega un código de batalla.");
        try {
            const enemy = JSON.parse(atob(code));
            if(enemy.type !== 'battle_v1') throw new Error("Código inválido");
            battle(enemy);
        } catch(e) {
            alert("Código de batalla inválido.");
        }
    }
}

function battle(enemy) {
    document.getElementById('coliseum-modal').classList.remove('open');
    
    // Lógica simple de batalla
    // Daño = (Atk / EnemyDef) * FactorElemento * Random
    
    let myPower = state.stats.atk + state.stats.spd + state.stats.def;
    let enemyPower = enemy.stats.atk + enemy.stats.spd + enemy.stats.def;
    
    // Ventaja elemental
    const adv = {
        fuego: 'planta', planta: 'agua', agua: 'fuego', electrico: 'agua'
    };
    
    if(adv[state.element] === enemy.element) myPower *= 1.2;
    if(adv[enemy.element] === state.element) enemyPower *= 1.2;
    
    // Factor aleatorio
    myPower *= (0.9 + Math.random()*0.2);
    enemyPower *= (0.9 + Math.random()*0.2);
    
    const won = myPower > enemyPower;
    
    const modal = document.getElementById('generic-modal');
    document.getElementById('modal-title').innerText = won ? "🏆 ¡VICTORIA!" : "💀 DERROTA";
    document.getElementById('modal-desc').innerText = `Luchaste contra ${enemy.name} (${enemy.element.toUpperCase()})`;
    
    if(won) {
        state.wins++;
        state.stats.atk += 2;
        state.stats.def += 2;
        spawnParticles(0xffd700, 50);
        say("¡Soy el más fuerte!");
        document.getElementById('modal-body').innerHTML = `<p style="color:#2ed573; font-weight:bold">¡Ganaste experiencia!</p>`;
    } else {
        state.losses++;
        say("Necesito entrenar más...");
        document.getElementById('modal-body').innerHTML = `<p style="color:#ff4757; font-weight:bold">El rival era muy fuerte.</p>`;
    }
    
    save();
    modal.classList.add('open');
}

function getBattleCode() {
    // Generar código seguro (sin seed visual)
    const data = {
        type: 'battle_v1',
        name: state.name,
        element: state.element,
        level: state.level,
        stats: state.stats
    };
    return btoa(JSON.stringify(data));
}

// --- QUIMERA-DEX ---
function showDex() {
    const modal = document.getElementById('dex-modal');
    const grid = document.getElementById('dex-grid');
    const count = document.getElementById('dex-count');
    
    grid.innerHTML = '';
    count.innerText = state.discoveries.length;
    
    if(state.discoveries.length === 0) {
        grid.innerHTML = '<p style="grid-column:span 2; text-align:center; color:#999">Aún no has descubierto nada.</p>';
    } else {
        state.discoveries.forEach(d => {
            const item = document.createElement('div');
            item.style.cssText = "background:#f1f2f6; padding:10px; border-radius:8px; font-size:0.8rem; text-align:center";
            item.innerHTML = `
                <div style="font-weight:bold; color:#6c5ce7">${d.comp.join('+')}</div>
                <div style="color:#555">${d.effect}</div>
            `;
            grid.appendChild(item);
        });
    }
    
    modal.classList.add('open');
}

function showMyBattleID() {
    const code = getBattleCode();
    document.getElementById('coliseum-modal').classList.remove('open');
    const modal = document.getElementById('generic-modal');
    document.getElementById('modal-title').innerText = "🛡️ Tu Código de Batalla";
    document.getElementById('modal-desc').innerText = "Comparte esto para que otros luchen contra ti (No pueden robar tu criatura).";
    document.getElementById('modal-body').innerHTML = `
        <textarea readonly onclick="this.select()">${code}</textarea>
        <button id="copy-battle-btn" class="action-btn" style="width:100%; font-size:0.9rem">COPIAR</button>
    `;
    
    // Agregar event listener al botón de copiar
    const copyBtn = document.getElementById('copy-battle-btn');
    if(copyBtn) {
        copyBtn.onclick = function(e) {
            e.stopPropagation();
            navigator.clipboard.writeText(code);
            alert('Copiado!');
        };
    }
    
    modal.classList.add('open');
}

// --- SISTEMA DE ALMACENAMIENTO (PC) ---
function showStorage() {
    document.getElementById('storage-modal').classList.add('open');
    renderStorage();
}

function closeStorage(e) {
    if(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const modal = document.getElementById('storage-modal');
    if(modal) {
        modal.classList.remove('open');
    }
    // Limpiar input
    const input = document.getElementById('storage-import-input');
    if(input) input.value = '';
}

function renderStorage() {
    const list = document.getElementById('storage-list');
    const count = document.getElementById('storage-count');
    const max = document.getElementById('storage-max');
    
    list.innerHTML = '';
    count.innerText = state.storage.length;
    max.innerText = state.maxStorage;

    if(state.storage.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#999">PC Vacío</div>';
    }

    state.storage.forEach((mon, idx) => {
        const row = document.createElement('div');
        row.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:white; padding:10px; border-radius:8px; border:1px solid #eee";
        
        const info = document.createElement('div');
        info.innerHTML = `<strong>${mon.name}</strong> <span style="font-size:0.8rem; color:#666">LVL ${mon.level}</span><br><span class="element-badge type-${mon.element}" style="font-size:0.6rem; padding:2px 5px">${mon.element}</span>`;
        
        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '5px';

        const btnSwap = document.createElement('button');
        btnSwap.innerText = "🔄";
        btnSwap.className = "action-btn";
        btnSwap.style.padding = "5px 10px";
        btnSwap.style.fontSize = "1rem";
        btnSwap.onclick = () => swapCreature(idx);

        const btnDel = document.createElement('button');
        btnDel.innerText = "❌";
        btnDel.className = "action-btn";
        btnDel.style.padding = "5px 10px";
        btnDel.style.fontSize = "1rem";
        btnDel.style.background = "#ff7675";
        btnDel.style.color = "white";
        btnDel.onclick = () => releaseCreature(idx);

        actions.appendChild(btnSwap);
        actions.appendChild(btnDel);
        
        row.appendChild(info);
        row.appendChild(actions);
        list.appendChild(row);
    });
}

function swapCreature(idx) {
    if(!state.born) return alert("¡Primero debes eclosionar tu huevo actual!");
    
    const temp = JSON.parse(JSON.stringify(state));
    // Limpiar propiedades globales del objeto temporal
    delete temp.inventory;
    delete temp.discoveries;
    delete temp.storage;
    delete temp.maxStorage;
    delete temp.tutorialSeen;
    delete temp.wins;
    delete temp.losses;

    const toEquip = state.storage[idx];
    
    // Actualizar estado actual con el nuevo
    Object.assign(state, toEquip);
    
    // Guardar el viejo en storage
    state.storage[idx] = temp;
    
    save();
    renderStorage();
    generateCreatureVisuals();
    updateUI();
    say(`¡${state.name} te elijo a ti!`);
}

function releaseCreature(idx) {
    if(confirm("¿Estás seguro de liberar a esta criatura? No podrás recuperarla.")) {
        state.storage.splice(idx, 1);
        save();
        renderStorage();
    }
}

function importToStorage() {
    // Verificar que el modal del storage esté abierto
    const storageModal = document.getElementById('storage-modal');
    if(!storageModal || !storageModal.classList.contains('open')) {
        console.warn('importToStorage llamado sin modal abierto');
        return;
    }
    
    const input = document.getElementById('storage-import-input');
    const code = input.value.trim();
    if(!code) return;

    try {
        const data = JSON.parse(atob(code));
        // Validar estructura básica
        if(!data.name || !data.stats || !data.features) throw new Error("Datos inválidos");
        
        if(state.storage.length >= state.maxStorage) {
            return alert("¡PC Lleno! Sube a nivel 20 para ampliar.");
        }

        state.storage.push(data);
        save();
        renderStorage();
        input.value = '';
        alert("¡Criatura importada al PC!");
    } catch(e) {
        alert("Código inválido.");
    }
}

// --- CREACIÓN DE HUEVOS ---
function createEggFromLab() {
    if(state.storage.length >= state.maxStorage) {
        return alert("¡El PC está lleno! Libera espacio o sube de nivel.");
    }

    // Generar criatura basada en elementos seleccionados
    // Lógica simple: Usar el primer elemento para determinar tipo
    let elemType = 'normal';
    if(selectedChems.length > 0) {
        const s = selectedChems[0].sym;
        if(['H','O','Cl'].includes(s)) elemType = 'agua';
        else if(['C','N','S','P'].includes(s)) elemType = 'planta';
        else if(['Fe','Au','U'].includes(s)) elemType = 'electrico';
        else elemType = 'fuego';
    }

    const newMon = generateCreatureData(elemType);
    state.storage.push(newMon);
    save();
    closeLab();
    
    // Feedback
    const modal = document.getElementById('generic-modal');
    document.getElementById('modal-title').innerText = "🥚 ¡Huevo Creado!";
    document.getElementById('modal-desc').innerText = "Se ha enviado un nuevo huevo al PC.";
    document.getElementById('modal-body').innerHTML = `
        <div style="text-align:center; font-size:3rem">🥚</div>
        <p>Tipo: <strong>${newMon.element.toUpperCase()}</strong></p>
        <p style="font-size:0.8rem">Ve al PC para incubarlo (Intercambiar).</p>
    `;
    modal.classList.add('open');
}

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
function showTutorial() {
    document.getElementById('tutorial-modal').classList.add('open');
    state.tutorialSeen = true;
    save();
}

function closeTutorial(e) {
    if(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const modal = document.getElementById('tutorial-modal');
    if(modal) {
        modal.classList.remove('open');
    }
}

function closeTraining(e) {
    if(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const modal = document.getElementById('training-modal');
    if(modal) {
        modal.classList.remove('open');
    }
}

function closeDex(e) {
    if(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const modal = document.getElementById('dex-modal');
    if(modal) {
        modal.classList.remove('open');
    }
}