document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const DB = {
        ELEMENTS: {
            agua: { name: 'Agua', emoji: '💧', category: 'base', soundCategory: 'Liquid' },
            fuego: { name: 'Fuego', emoji: '🔥', category: 'base', soundCategory: 'Fiery' },
            tierra: { name: 'Tierra', emoji: '🌍', category: 'base', soundCategory: 'Earthy' },
            aire: { name: 'Aire', emoji: '💨', category: 'base', soundCategory: 'Gaseous' },
            vapor: { name: 'Vapor', emoji: '☁️', soundCategory: 'Gaseous' },
            lodo: { name: 'Lodo', emoji: '🟤', soundCategory: 'Earthy' },
            lava: { name: 'Lava', emoji: '🌋', soundCategory: 'Fiery' },
            energia: { name: 'Energía', emoji: '⚡', soundCategory: 'Fiery' },
            piedra: { name: 'Piedra', emoji: '🪨', soundCategory: 'Earthy' },
            arena: { name: 'Arena', emoji: '🏖️', soundCategory: 'Earthy' },
            vidrio: { name: 'Vidrio', emoji: '🔍', soundCategory: 'Earthy' },
            vida: { name: 'Vida', emoji: '🧬', soundCategory: 'Organic' },
            planta: { name: 'Planta', emoji: '🌱', soundCategory: 'Organic' },
            mar: { name: 'Mar', emoji: '🌊', soundCategory: 'Liquid' },
            sal: { name: 'Sal', emoji: '🧂', soundCategory: 'Earthy' },
            metal: { name: 'Metal', emoji: '🔩', soundCategory: 'Metallic' },
            herramienta: { name: 'Herramienta', emoji: '🛠️', soundCategory: 'Metallic' }
        },
        MIXTURES: {
            'agua-fuego': 'vapor', 'agua-tierra': 'lodo', 'fuego-tierra': 'lava',
            'aire-fuego': 'energia', 'lava-aire': 'piedra', 'piedra-aire': 'arena',
            'arena-fuego': 'vidrio', 'energia-lodo': 'vida', 'vida-tierra': 'planta',
            'agua-agua': 'mar', 'lava-agua': 'sal', 'fuego-piedra': 'metal',
            'metal-vida': 'herramienta'
        }
    };

    let state = {
        currentUser: null, discovered: [], selected: { slot1: null, slot2: null },
        totalDiscoverable: 0, activeMissions: [], bestTimes: {}, missionStartTimes: {},
        isMixing: false,
    };

    let globalTimerInterval = null;

    const DOM = {
        authScreen: document.getElementById('authScreen'), loginForm: document.getElementById('loginForm'),
        registerForm: document.getElementById('registerForm'), loginBtn: document.getElementById('loginBtn'),
        registerBtn: document.getElementById('registerBtn'), showRegister: document.getElementById('showRegister'),
        showLogin: document.getElementById('showLogin'), gameWrapper: document.getElementById('gameWrapper'),
        playerName: document.getElementById('playerName'), logoutBtn: document.getElementById('logoutBtn'),
        elementsShelf: document.querySelector('.shelf-surface'), discoveriesList: document.getElementById('discoveriesList'),
        slot1: document.getElementById('slot1'), slot2: document.getElementById('slot2'),
        mixFlask: document.getElementById('mixFlask'), flaskLiquid: document.getElementById('flaskLiquid'),
        resultEmoji: document.getElementById('resultEmoji'), progressFill: document.getElementById('progressFill'),
        progressCounter: document.getElementById('progressCounter'), challengeBoard: document.getElementById('challengeBoard'),
        resetBtn: document.getElementById('resetBtn'), soundBtn: document.getElementById('soundBtn'),
        soundIcon: document.getElementById('soundIcon'),
        tabs: document.querySelectorAll('.tab-btn'), tabContents: document.querySelectorAll('.tab-content'),
        leaderboardList: document.getElementById('leaderboardList'),
        sounds: {
            ambient: document.getElementById('soundAmbient'), drag: document.getElementById('soundDrag'),
            drop: document.getElementById('soundDrop'), success: document.getElementById('soundSuccess'),
            error: document.getElementById('soundError'), discovery: document.getElementById('soundDiscovery'),
            missionComplete: document.getElementById('soundMissionComplete'), hover: document.getElementById('soundHover'),
            newRecord: document.getElementById('soundNewRecord'), Liquid: document.getElementById('soundLiquid'),
            Fiery: document.getElementById('soundFiery'), Earthy: document.getElementById('soundEarthy'),
            Gaseous: document.getElementById('soundGaseous'), Metallic: document.getElementById('soundMetallic'),
            Organic: document.getElementById('soundOrganic')
        }
    };

    const AudioController = {
        initialized: false, isMuted: false, activeSoundTimers: {},
        init() {
            if (this.initialized) return;
            Object.values(DOM.sounds).forEach(sound => {
                sound.volume = 0; sound.play().then(() => sound.pause()).catch(() => {}); sound.volume = 1;
            });
            this.initialized = true; this.toggleMute(false, true);
        },
        playSound(soundName, volume = 1, duration = null) {
            if (!this.initialized || this.isMuted || !DOM.sounds[soundName]) return;
            const sound = DOM.sounds[soundName];
            
            if(this.activeSoundTimers[soundName]) {
                clearTimeout(this.activeSoundTimers[soundName]);
            }

            sound.currentTime = 0; sound.volume = volume;
            sound.play().catch(() => {});

            if (duration) {
                this.activeSoundTimers[soundName] = setTimeout(() => {
                    sound.pause();
                    sound.currentTime = 0;
                }, duration);
            }
        },
        toggleMute(forceOff = false, forceOn = false) {
            if (forceOff) this.isMuted = true; else if (forceOn) this.isMuted = false; else this.isMuted = !this.isMuted;
            DOM.soundIcon.className = `fa-solid ${this.isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`;
            if (this.initialized) {
                if (!this.isMuted) { DOM.sounds.ambient.volume = 0.2; DOM.sounds.ambient.play(); }
                else { DOM.sounds.ambient.pause(); }
            }
        }
    };
    
    const Auth = {
        init() {
            DOM.authScreen.classList.add('active');
            DOM.showRegister.addEventListener('click', (e) => { e.preventDefault(); this.toggleForms(); });
            DOM.showLogin.addEventListener('click', (e) => { e.preventDefault(); this.toggleForms(); });
            DOM.registerBtn.addEventListener('click', () => this.register());
            DOM.loginBtn.addEventListener('click', () => this.login());
            DOM.logoutBtn.addEventListener('click', () => this.logout());
        },
        toggleForms() {
            DOM.loginForm.style.display = DOM.loginForm.style.display === 'none' ? 'block' : 'none';
            DOM.registerForm.style.display = DOM.registerForm.style.display === 'none' ? 'block' : 'none';
        },
        getUsers() { return JSON.parse(localStorage.getItem('scientistUsers')) || {}; },
        saveUsers(users) { localStorage.setItem('scientistUsers', JSON.stringify(users)); },
        register() {
            const username = document.getElementById('registerUsername').value.trim();
            const password = document.getElementById('registerPassword').value.trim();
            if (!username || !password) return alert('Por favor, completa todos los campos.');
            const users = this.getUsers(); if (users[username]) return alert('Este Nombre de Científico ya existe.');
            users[username] = { password, discovered: ['agua', 'fuego', 'tierra', 'aire'], bestTimes: {} };
            this.saveUsers(users); alert('¡Registro completado! Ahora puedes ingresar.'); this.toggleForms();
        },
        login() {
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            if (!username || !password) return alert('Por favor, completa todos los campos.');
            const users = this.getUsers(); if (!users[username] || users[username].password !== password) return alert('Credenciales incorrectas.');
            AudioController.init(); state.currentUser = username;
            DOM.authScreen.classList.remove('active'); DOM.gameWrapper.classList.add('active'); Game.init();
        },
        logout() {
            Game.saveState(); state.currentUser = null;
            document.getElementById('loginUsername').value = ''; document.getElementById('loginPassword').value = '';
            DOM.gameWrapper.classList.remove('active'); DOM.authScreen.classList.add('active');
            AudioController.toggleMute(true); if (globalTimerInterval) clearInterval(globalTimerInterval);
        }
    };
    
    const Game = {
        init() {
            state.totalDiscoverable = Object.keys(DB.ELEMENTS).filter(id => !DB.ELEMENTS[id].category).length;
            this.loadState(); DOM.playerName.textContent = state.currentUser;
            this.populateMissions(); Renderer.renderAll(); this.setupEventListeners();
            AudioController.toggleMute(false, true);
            if (globalTimerInterval) clearInterval(globalTimerInterval);
            globalTimerInterval = setInterval(Renderer.updateMissionTimers, 100);
        },
        populateMissions() {
            const missionsToGet = 3 - state.activeMissions.length;
            for (let i = 0; i < missionsToGet; i++) this.getNewMission();
            Renderer.renderMissions();
        },
        getNewMission() {
            const potentialMissions = Object.keys(DB.ELEMENTS).filter(id => !DB.ELEMENTS[id].category && !state.discovered.includes(id) && !state.activeMissions.some(m => m.target === id));
            if (potentialMissions.length > 0) {
                const newMissionTarget = potentialMissions[Math.floor(Math.random() * potentialMissions.length)];
                state.activeMissions.push({ target: newMissionTarget, hintGiven: false });
                if (!state.missionStartTimes[newMissionTarget]) { state.missionStartTimes[newMissionTarget] = Date.now(); }
            }
        },
        attemptMix() {
            const { slot1, slot2 } = state.selected; if (!slot1 || !slot2) return;
            state.isMixing = true;
            Renderer.animateReactionStart();
            setTimeout(() => {
                const key1 = `${slot1}-${slot2}`, key2 = `${slot2}-${slot1}`;
                const resultId = DB.MIXTURES[key1] || DB.MIXTURES[key2];
                if (resultId) this.onMixSuccess(resultId); else this.onMixFail();
                setTimeout(() => { this.resetMixStation(); }, 1500);
            }, 800);
        },
        onMixSuccess(resultId) {
            const isNewDiscovery = !state.discovered.includes(resultId);
            Renderer.animateSuccess(resultId); AudioController.playSound('success');
            if (isNewDiscovery) {
                AudioController.playSound(DB.ELEMENTS[resultId].soundCategory, 0.6, 3000);
                AudioController.playSound('discovery'); state.discovered.push(resultId);
                Renderer.flyElementToShelf(resultId, () => { Renderer.renderAll(); Renderer.highlightNewDiscovery(resultId); });
            }
            this.checkMissionCompletion(resultId);
        },
        checkMissionCompletion(resultId) {
            const missionIndex = state.activeMissions.findIndex(m => m.target === resultId);
            if (missionIndex > -1) {
                const elapsedTime = Date.now() - state.missionStartTimes[resultId];
                let isNewRecord = false;
                if (!state.bestTimes[resultId] || elapsedTime < state.bestTimes[resultId]) {
                    state.bestTimes[resultId] = elapsedTime;
                    this.updateGlobalLeaderboard(resultId, elapsedTime);
                    AudioController.playSound('newRecord');
                    isNewRecord = true;
                }
                AudioController.playSound('missionComplete');
                if (typeof confetti === 'function') confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
                const missionCard = DOM.challengeBoard.querySelector(`[data-mission-target="${resultId}"]`);
                if (missionCard) missionCard.classList.add('completed');
                setTimeout(() => {
                    state.activeMissions.splice(missionIndex, 1);
                    delete state.missionStartTimes[resultId];
                    this.getNewMission(); Renderer.renderMissions(); this.saveState();
                    if(isNewRecord) alert(`¡NUEVO RÉCORD para ${DB.ELEMENTS[resultId].name}: ${Renderer.formatTime(elapsedTime)}!`);
                }, 500);
            } else { this.saveState(); }
        },
        provideHint(target) {
            const mission = state.activeMissions.find(m => m.target === target); if (!mission || mission.hintGiven) return;
            mission.hintGiven = true; Renderer.renderMissions(); this.saveState();
        },
        onMixFail() { Renderer.animateFailure(); AudioController.playSound('error'); },
        saveState() {
            if (!state.currentUser) return; const users = Auth.getUsers();
            users[state.currentUser] = { ...users[state.currentUser], discovered: state.discovered, activeMissions: state.activeMissions, bestTimes: state.bestTimes, missionStartTimes: state.missionStartTimes };
            Auth.saveUsers(users);
        },
        loadState() {
            const userData = Auth.getUsers()[state.currentUser];
            if (userData) {
                state.discovered = userData.discovered || ['agua', 'fuego', 'tierra', 'aire'];
                state.activeMissions = userData.activeMissions || [];
                state.bestTimes = userData.bestTimes || {};
                state.missionStartTimes = userData.missionStartTimes || {};
            }
        },
        resetGame() {
            if (confirm("¿Estás seguro? ¡Todo tu progreso y récords serán reiniciados!")) {
                state.discovered = ['agua', 'fuego', 'tierra', 'aire']; state.activeMissions = [];
                state.bestTimes = {}; state.missionStartTimes = {};
                this.saveState(); this.resetMixStation();
                this.populateMissions(); Renderer.renderAll();
            }
        },
        resetMixStation() {
            state.selected = { slot1: null, slot2: null };
            state.isMixing = false;
            Renderer.resetMixStation();
        },
        updateGlobalLeaderboard(target, time) {
            let leaderboard = JSON.parse(localStorage.getItem('globalLeaderboard')) || {};
            if (!leaderboard[target]) leaderboard[target] = [];
            leaderboard[target] = leaderboard[target].filter(entry => entry.user !== state.currentUser);
            leaderboard[target].push({ user: state.currentUser, time });
            leaderboard[target].sort((a, b) => a.time - b.time).splice(10);
            localStorage.setItem('globalLeaderboard', JSON.stringify(leaderboard));
        },
        setupEventListeners() {
            DOM.resetBtn.onclick = () => this.resetGame();
            DOM.soundBtn.onclick = () => AudioController.toggleMute();
            DOM.tabs.forEach(tab => tab.addEventListener('click', () => Renderer.switchTab(tab.dataset.tab)));
            document.addEventListener('dragstart', e => {
                if (e.target.classList.contains('element-item')) {
                    const id = e.target.dataset.id; e.dataTransfer.setData('text/plain', id);
                    AudioController.playSound(DB.ELEMENTS[id].soundCategory, 1, 3000);
                }
            });
            DOM.elementsShelf.addEventListener('mouseover', e => {
                if(e.target.closest('.element-item')) AudioController.playSound('hover', 0.3);
            });
            [DOM.slot1, DOM.slot2].forEach(slot => {
                slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('drag-over'); });
                slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
                slot.addEventListener('drop', e => {
                    if (state.isMixing) return;
                    e.preventDefault(); slot.classList.remove('drag-over');
                    const id = e.dataTransfer.getData('text/plain'); if (!id) return;
                    state.selected[`slot${slot.dataset.slot}`] = id;
                    slot.innerHTML = `<div class="element-emoji">${DB.ELEMENTS[id].emoji}</div>`;
                    slot.classList.add('pulse'); setTimeout(() => slot.classList.remove('pulse'), 400);
                    AudioController.playSound('drop'); this.attemptMix();
                });
            });
        }
    };
    
    const Renderer = {
        renderAll() { this.renderElements(); this.renderDiscoveries(); this.updateProgress(); },
        renderMissions() {
            DOM.challengeBoard.innerHTML = '';
            if (state.activeMissions.length === 0 && state.discovered.length - 4 >= state.totalDiscoverable) {
                DOM.challengeBoard.innerHTML = '<p style="grid-column: 1 / -1; font-family: var(--font-title); font-size: 1.2rem;">¡Felicidades, has completado toda la investigación!</p>';
                return;
            }
            state.activeMissions.forEach(mission => {
                const missionEl = DB.ELEMENTS[mission.target]; const card = document.createElement('div');
                card.className = 'mission-card'; card.dataset.missionTarget = mission.target;
                let hintHTML = '';
                if (mission.hintGiven) {
                    let ingredients = [];
                     for (const key in DB.MIXTURES) if (DB.MIXTURES[key] === mission.target) { ingredients = key.split('-'); break; }
                    const hintEl = DB.ELEMENTS[ingredients[0]];
                    hintHTML = `<div class="mission-hint">Pista: Se necesita ${hintEl.emoji} ${hintEl.name}...</div>`;
                }
                card.innerHTML = `<div class="mission-text">Sintetiza: ${missionEl.emoji} ${missionEl.name}</div><div class="mission-timer" data-timer-target="${mission.target}">--:--.-</div>${hintHTML}<div class="mission-controls"><button class="help-btn" data-target="${mission.target}" ${mission.hintGiven ? 'disabled' : ''}>Solicitar Pista</button></div>`;
                DOM.challengeBoard.appendChild(card);
            });
            document.querySelectorAll('.help-btn').forEach(btn => btn.onclick = () => Game.provideHint(btn.dataset.target));
        },
        updateMissionTimers() {
            document.querySelectorAll('.mission-timer').forEach(timer => {
                const target = timer.dataset.timerTarget;
                if (state.missionStartTimes[target]) {
                    const elapsedTime = Date.now() - state.missionStartTimes[target];
                    timer.textContent = Renderer.formatTime(elapsedTime);
                }
            });
        },
        renderElements() {
            DOM.elementsShelf.innerHTML = ''; state.discovered.sort().forEach(id => {
                const el = DB.ELEMENTS[id]; const elDiv = document.createElement('div');
                elDiv.className = 'element-item'; elDiv.dataset.id = id; elDiv.draggable = true;
                elDiv.innerHTML = `<div class="element-emoji">${el.emoji}</div><div class="element-name">${el.name}</div>`;
                DOM.elementsShelf.appendChild(elDiv);
            });
        },
        renderDiscoveries() {
            DOM.discoveriesList.innerHTML = '';
            Object.keys(DB.ELEMENTS).filter(id => !DB.ELEMENTS[id].category).sort((a,b) => DB.ELEMENTS[a].name.localeCompare(DB.ELEMENTS[b].name)).forEach(id => {
                const isDiscovered = state.discovered.includes(id); const el = DB.ELEMENTS[id];
                const item = document.createElement('div'); item.className = 'discovery-item'; item.dataset.discoveryId = id;
                item.style.opacity = isDiscovered ? '1' : '0.3';
                const bestTime = state.bestTimes[id] ? `<div class="personal-best">Récord: ${this.formatTime(state.bestTimes[id])}</div>` : '';
                item.innerHTML = `<div class="discovery-item-main"><div class="element-emoji">${isDiscovered ? el.emoji : '?'}</div><div class="discovery-info"><div class="element-name">${isDiscovered ? el.name : 'Compuesto Secreto'}</div>${bestTime}</div></div>`;
                DOM.discoveriesList.appendChild(item);
            });
        },
        renderLeaderboard() {
            DOM.leaderboardList.innerHTML = ''; const leaderboard = JSON.parse(localStorage.getItem('globalLeaderboard')) || {};
            if (Object.keys(leaderboard).length === 0) { DOM.leaderboardList.innerHTML = '<p>¡El Salón de la Fama está vacío!</p>'; return; }
            Object.keys(leaderboard).sort((a,b) => DB.ELEMENTS[a].name.localeCompare(DB.ELEMENTS[b].name)).forEach(target => {
                const el = DB.ELEMENTS[target]; const title = document.createElement('h3');
                title.innerHTML = `${el.emoji} ${el.name}`; title.style.fontFamily = 'var(--font-title)'; DOM.leaderboardList.appendChild(title);
                leaderboard[target].forEach((score, index) => {
                    const item = document.createElement('div'); item.className = 'leaderboard-item';
                    item.innerHTML = `<span>#${index + 1} ${score.user}</span><span>${this.formatTime(score.time)}</span>`;
                    DOM.leaderboardList.appendChild(item);
                });
            });
        },
        switchTab(tabId) {
            DOM.tabContents.forEach(c => c.classList.remove('active')); DOM.tabs.forEach(t => t.classList.remove('active'));
            document.getElementById(`${tabId}Content`).classList.add('active');
            document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
            if (tabId === 'leaderboard') this.renderLeaderboard();
        },
        highlightNewDiscovery(elementId) {
            const item = DOM.discoveriesList.querySelector(`[data-discovery-id="${elementId}"]`);
            if (item) { item.classList.add('newly-discovered'); setTimeout(() => item.classList.remove('newly-discovered'), 1000); }
        },
        updateProgress() {
            const discoveredCount = state.discovered.length - 4;
            const percentage = state.totalDiscoverable > 0 ? (discoveredCount / state.totalDiscoverable) * 100 : 0;
            DOM.progressFill.style.width = `${percentage}%`;
            DOM.progressCounter.textContent = `${discoveredCount} / ${state.totalDiscoverable} Compuestos`;
        },
        flyElementToShelf(resultId, onComplete) {
            const startRect = DOM.mixFlask.getBoundingClientRect(); const endRect = DOM.elementsShelf.getBoundingClientRect();
            const flyingEl = document.createElement('div'); flyingEl.className = 'element-item';
            flyingEl.innerHTML = `<div class="element-emoji">${DB.ELEMENTS[resultId].emoji}</div>`;
            flyingEl.style.cssText = `position: fixed; top: ${startRect.top}px; left: ${startRect.left}px; width: ${startRect.width}px; z-index: 1001; transition: all 0.7s ease-in-out;`;
            document.body.appendChild(flyingEl);
            setTimeout(() => {
                flyingEl.style.top = `${endRect.top + 20}px`; flyingEl.style.left = `${endRect.right - 100}px`;
                flyingEl.style.transform = 'scale(0.5)'; flyingEl.style.opacity = '0';
            }, 50);
            setTimeout(() => { flyingEl.remove(); if (onComplete) onComplete(); }, 750);
        },
        animateReactionStart() { DOM.mixFlask.classList.add('active'); DOM.flaskLiquid.style.cssText = "height: 60%; background-color: var(--cyan);"; },
        animateSuccess(resultId) {
            DOM.flaskLiquid.style.backgroundColor = 'var(--success)';
            DOM.resultEmoji.innerHTML = DB.ELEMENTS[resultId].emoji;
            DOM.resultEmoji.classList.add('active');
            DOM.mixFlask.classList.add('success-flash'); setTimeout(() => DOM.mixFlask.classList.remove('success-flash'), 500);
        },
        animateFailure() {
            DOM.flaskLiquid.style.backgroundColor = 'var(--error)';
            DOM.resultEmoji.innerHTML = '💨';
            DOM.resultEmoji.classList.add('active');
            DOM.mixFlask.classList.add('error-flash'); setTimeout(() => DOM.mixFlask.classList.remove('error-flash'), 500);
        },
        resetMixStation() {
            [DOM.slot1, DOM.slot2].forEach(slot => { slot.innerHTML = '<span class="slot-placeholder">+</span>'; });
            DOM.flaskLiquid.style.height = '0%';
            DOM.resultEmoji.innerHTML = ''; DOM.resultEmoji.classList.remove('active');
        },
        formatTime(ms) {
            const minutes = Math.floor(ms / 60000); const seconds = Math.floor((ms % 60000) / 1000); const milliseconds = Math.floor((ms % 1000) / 100);
            return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${milliseconds}`;
        }
    };
    
    Auth.init();
});