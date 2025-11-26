// --- FUNCIONES DE UI Y BOTONES ---

// Esperar a que el DOM esté listo para asignar eventos
document.addEventListener('DOMContentLoaded', () => {
    // Asignar eventos a los botones principales
    const btnLab = document.getElementById('btn-lab');
    if(btnLab) btnLab.addEventListener('click', showLab);

    const btnTrain = document.getElementById('btn-train');
    if(btnTrain) btnTrain.addEventListener('click', showTraining);

    // btnColiseum eliminado

    const btnDex = document.getElementById('btn-dex');
    if(btnDex) btnDex.addEventListener('click', showDex);

    // btnStorage eliminado

    const btnExport = document.getElementById('btn-export');
    if(btnExport) btnExport.addEventListener('click', showExportDNA);

    const btnTutorial = document.getElementById('btn-tutorial');
    if(btnTutorial) btnTutorial.addEventListener('click', showTutorial);

    const btnPhoto = document.getElementById('btn-photo');
    if(btnPhoto) btnPhoto.addEventListener('click', sharePhoto);

    const btnReset = document.getElementById('btn-reset');
    if(btnReset) btnReset.addEventListener('click', resetGame);

    // Eventos de modales
    const btnCloseTutorial = document.getElementById('btn-close-tutorial');
    if(btnCloseTutorial) btnCloseTutorial.addEventListener('click', closeTutorial);

    // Cerrar modales al hacer click fuera
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('open');
        }
    });

    const btnCloseLab = document.getElementById('btn-close-lab');
    if(btnCloseLab) btnCloseLab.addEventListener('click', closeLab);

    const btnCloseTraining = document.getElementById('btn-close-training');
    if(btnCloseTraining) btnCloseTraining.addEventListener('click', closeTraining);

    // Eventos del Coliseo eliminados

    const btnCloseDex = document.getElementById('btn-close-dex');
    if(btnCloseDex) btnCloseDex.addEventListener('click', closeDex);

    const btnCloseGeneric = document.getElementById('btn-close-generic');
    if(btnCloseGeneric) btnCloseGeneric.addEventListener('click', closeModal);
});

// --- SISTEMA DE ID / IMPORT / EXPORT ---
function showExportDNA() {
    const t = translations[currentLang];
    if(!state.born) return alert(t.needEgg);
    const modal = document.getElementById('generic-modal');
    
    const title = currentLang === 'es' ? "💾 Guardar Progreso" : "💾 Save Progress";
    const desc = currentLang === 'es' ? "Este código contiene TODO tu juego (Criatura, PC, Inventario). Guárdalo en un lugar seguro." : "This code contains ALL your game data. Keep it safe.";
    const btnText = currentLang === 'es' ? "COPIAR SAVEGAME" : "COPY SAVEGAME";
    const copied = currentLang === 'es' ? "Copiado!" : "Copied!";

    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-desc').innerText = desc;
    
    // Generar Base64 del estado
    const dnaString = btoa(JSON.stringify(state));
    
    document.getElementById('modal-body').innerHTML = `
        <textarea readonly onclick="this.select()">${dnaString}</textarea>
        <button class="action-btn" style="width:100%; font-size:0.9rem" onclick="navigator.clipboard.writeText('${dnaString}'); alert('${copied}')">${btnText}</button>
    `;
    modal.classList.add('open');
}

function showImportDNA() {
    const modal = document.getElementById('generic-modal');
    const title = currentLang === 'es' ? "🧬 Importar DNA" : "🧬 Import DNA";
    const desc = currentLang === 'es' ? "Pega el código de otra criatura. ¡Cuidado, reemplazará la tuya!" : "Paste another creature's code. Warning: This will replace yours!";
    const placeholder = currentLang === 'es' ? "Pega el código aquí..." : "Paste code here...";
    const btnText = currentLang === 'es' ? "IMPORTAR" : "IMPORT";

    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-desc').innerText = desc;
    
    document.getElementById('modal-body').innerHTML = `
        <textarea id="import-area" placeholder="${placeholder}"></textarea>
        <button class="action-btn" style="width:100%; background:#54a0ff; color:white; font-size:0.9rem" onclick="processImport()">${btnText}</button>
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
        say(currentLang === 'es' ? "¡Transformación completa!" : "Transformation complete!");
    } catch(e) {
        alert(currentLang === 'es' ? "Error: El código DNA no es válido." : "Error: Invalid DNA code.");
    }
}

// --- FOTO / COMPARTIR ---
async function sharePhoto() {
    renderer.render(scene, camera);
    renderer.domElement.toBlob(async blob => {
        const file = new File([blob], "devicemon_evo.png", {type:"image/png"});
        const title = state.name;
        const text = currentLang === 'es' ? `¡Mira mi ${state.name} Nivel ${state.level}!` : `Check out my ${state.name} Level ${state.level}!`;
        
        if(navigator.share && navigator.canShare({files:[file]})) {
            navigator.share({files:[file], title: title, text: text});
        } else {
            const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download="mon.png"; a.click();
        }
    });
}

// --- LÓGICA DEL LABORATORIO ---
function showLab() {
    const t = translations[currentLang];
    if(!state.born) return alert(t.needEgg);
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

function closeLab() {
    document.getElementById('lab-modal').classList.remove('open');
}

function closeTraining() {
    document.getElementById('training-modal').classList.remove('open');
}

// Funciones de Coliseo eliminadas: closeColiseum, showColiseum, startBattle, battle, getBattleCode, showMyBattleID

function closeDex() {
    document.getElementById('dex-modal').classList.remove('open');
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
    if(selectedChems.length === 0) return alert(currentLang === 'es' ? "Selecciona al menos 1 elemento." : "Select at least 1 element.");
    
    // Crear objeto de comida
    const foodData = {
        type: 'lab_food',
        comp: selectedChems.map(c => c.sym),
        power: Math.floor(Math.random() * 100)
    };
    
    // Registrar en Dex (ordenado para consistencia)
    const sortedComp = [...foodData.comp].sort();
    const compStr = sortedComp.join('+');
    
    // Safety check for discoveries
    if(!state.discoveries) state.discoveries = [];
    
    const exists = state.discoveries.find(d => d.comp && d.comp.join('+') === compStr);
    
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
    
    const titleKnown = currentLang === 'es' ? "🧪 Suero Sintetizado" : "🧪 Serum Synthesized";
    const titleNew = currentLang === 'es' ? "✨ ¡NUEVO DESCUBRIMIENTO!" : "✨ NEW DISCOVERY!";
    const descKnown = currentLang === 'es' ? "Has creado un compuesto conocido." : "You created a known compound.";
    const descNew = currentLang === 'es' ? "¡Has registrado una nueva fórmula!" : "You registered a new formula!";
    const saveBtn = currentLang === 'es' ? "🎒 GUARDAR" : "🎒 SAVE";
    const giveBtn = currentLang === 'es' ? "DAR A" : "GIVE TO";
    const copyText = currentLang === 'es' ? "Copia este código para compartirlo:" : "Copy this code to share:";

    document.getElementById('modal-title').innerText = exists ? titleKnown : titleNew;
    document.getElementById('modal-desc').innerText = exists ? descKnown : descNew;
    document.getElementById('modal-body').innerHTML = `
        <div style="background:#f1f2f6; padding:15px; border-radius:10px; margin-bottom:10px">
            <h3 style="margin:0; color:#6c5ce7">${selectedChems.map(c=>c.sym).join('-')}</h3>
            <p style="font-size:0.8rem; color:#888">Potencia: ${foodData.power}%</p>
        </div>
        <p style="font-size:0.9rem">${copyText}</p>
        <textarea readonly onclick="this.select()">${foodId}</textarea>
        <div style="display:flex; gap:10px; margin-top:10px">
            <button class="action-btn" style="flex:1; font-size:0.9rem; background:#dfe6e9" onclick="saveToInventory('${foodId}')">${saveBtn}</button>
            <button class="action-btn" style="flex:1; background:#6c5ce7; color:white; font-size:0.9rem" onclick="tryConsume('${foodId}')">${giveBtn} ${state.name.toUpperCase()}</button>
        </div>
    `;
    modal.classList.add('open');
}

function saveToInventory(foodId) {
    if(state.inventory.length >= 10) return alert(currentLang === 'es' ? "¡Almacén lleno! (Máx 10)" : "Storage full! (Max 10)");
    const food = JSON.parse(atob(foodId));
    state.inventory.push(food);
    save();
    alert(currentLang === 'es' ? "Guardado en el almacén." : "Saved to storage.");
    closeModal();
}

function tryConsume(foodId) {
    if(state.meals >= 3) return alert(currentLang === 'es' ? "¡Está lleno! Guárdalo para mañana." : "It's full! Save it for tomorrow.");
    consumeFood(foodId);
}

function importFood() {
    const input = document.getElementById('food-import-input');
    const code = input.value.trim();
    if(!code) return alert(currentLang === 'es' ? "Pega un código primero." : "Paste a code first.");
    consumeFood(code);
    input.value = '';
    closeLab();
}

function consumeFood(base64Code) {
    const t = translations[currentLang];
    try {
        // Verificación de saciedad
        if(state.meals >= 3) {
            alert(t.full);
            return;
        }

        const food = JSON.parse(atob(base64Code));
        if(food.type !== 'lab_food') throw new Error(t.invalidCode);
        
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
            say(msg || t.delicious);
            
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
                msg += " " + t.weak;
                generateCreatureVisuals();
            }
            
            spawnParticles(0x555555, 30);
            say(msg || t.yuck);
        } else {
            say(t.tasteless);
        }
        
        // Contar como comida
        state.meals++;
        state.totalMeals++;
        state.lastDay = new Date().toDateString();
        if(state.meals === 3) setTimeout(evolve, 500);

        save();
        updateUI();
        
    } catch(e) {
        alert(t.invalidCode);
    }
}

// --- ENTRENAMIENTO ---
function showTraining() {
    const t = translations[currentLang];
    if(!state.born) return alert(t.needEgg);
    document.getElementById('training-modal').classList.add('open');
    document.getElementById('rps-result').innerText = "";
}

function playRPS(choice) {
    const t = translations[currentLang];
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
        resEl.innerText = `Tú: ${icons[choice]} vs CPU: ${icons[cpu]} -> ${t.win} (+XP)`;
        resEl.style.color = "#2ed573";
        state.stats.atk++; 
        spawnParticles(0x2ed573, 20);
        say("¡Sí! ¡Gané!");
    } else if(result === 'lose') {
        resEl.innerText = `Tú: ${icons[choice]} vs CPU: ${icons[cpu]} -> ${t.lose}`;
        resEl.style.color = "#ff4757";
        say("Auch...");
        creatureGroup.position.y -= 0.2; 
    } else {
        resEl.innerText = `Tú: ${icons[choice]} vs CPU: ${icons[cpu]} -> ${t.draw}`;
        resEl.style.color = "#ffa502";
    }
    save();
    updateUI();
}

// --- COLISEO ---
// Funciones eliminadas: showColiseum, startBattle, battle, getBattleCode, showMyBattleID

// --- QUIMERA-DEX ---
function showDex() {
    const t = translations[currentLang];
    const modal = document.getElementById('dex-modal');
    const grid = document.getElementById('dex-grid');
    const count = document.getElementById('dex-count');
    
    grid.innerHTML = '';
    count.innerText = state.discoveries.length;
    
    if(state.discoveries.length === 0) {
        grid.innerHTML = `<p style="grid-column:span 2; text-align:center; color:#999">${currentLang === 'es' ? "Aún no has descubierto nada." : "Nothing discovered yet."}</p>`;
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

// Funciones eliminadas: showMyBattleID

// --- SISTEMA DE ALMACENAMIENTO (PC) ---
// Funciones eliminadas: showStorage, closeStorage, renderStorage, swapCreature, releaseCreature, importToStorage

// --- CREACIÓN DE HUEVOS ---
// Función eliminada: createEggFromLab

// --- TUTORIAL ---
function showTutorial() {
    document.getElementById('tutorial-modal').classList.add('open');
    state.tutorialSeen = true;
}

function closeTutorial() {
    document.getElementById('tutorial-modal').classList.remove('open');
}

function resetGame() {
    const t = translations[currentLang];
    if(confirm(t.sureReset)) {
        // Usar la misma clave que en devicemon.js
        localStorage.removeItem('devicemon_dna_v4');
        location.reload();
    }
}
