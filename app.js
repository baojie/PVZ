import { SoundManager } from './classes/SoundManager.js';
import { PLANT_COOLDOWNS, setEmojiCursor } from './classes/Constants.js';
import { WandererSystem } from './classes/WandererSystem.js';
import { generateWaves, updateWaves, getTotalZombiesInWave } from './classes/WaveManager.js';
import { setupEventListeners } from './classes/UIEvents.js';
import { spawnProjectile } from './classes/CombatManager.js';
import { fireCannon } from './classes/CornCannon.js';
import { spawnSun, updateSunDisplay } from './classes/SunManager.js';
import { spawnPlant, updateCellDisplay } from './classes/PlantManager.js';
import { setupTooltip, PLANT_TIPS } from './classes/Tooltip.js';

// Lawnmower resting position (px) — sits just left of the lawn so the icon
// is mostly visible. See triggerLawnmower / setupLawnmowers.
const LAWNMOWER_X = -20;
const LAWNMOWER_TIP = '割草机 — 僵尸突防时自动清场（每行一台）';

class Game {
    constructor() {
        this.board = document.getElementById('game-board');
        this.sunCounter = document.getElementById('sun-amount');
        this.uiLayer = document.getElementById('ui-layer');

        this.width = 9;
        this.height = 5;
        this.cellWidth = 80;
        this.cellHeight = 100;
        this.boardWidth = this.width * this.cellWidth;

        this.sound = new SoundManager();
        this.firstGame = true;
        this.plantCount = 1;

        this._resetGameState();
        this.init();
    }

    _resetGameState() {
        this.suns = Infinity;
        this.deltaTime = 0;
        this.lastTime = 0;
        this.timeSinceLastSun = 0;
        this.isRunning = false;
        this.won = false;

        this.plants = [];
        this.zombies = [];
        this.projectiles = [];
        this.fallingSuns = [];
        this.lawnmowers = [];
        this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(null).map(() => []));

        this.selectedPlant = null;
        this.shovelMode = false;
        this.cannonTarget = null;
        this.pendingCannon = null;
        this.cannonIntervals = [];
        this.zombieSpeedMultiplier = 1;
        this.zombieSpeedBoost = 1;
        this.randomBullets = false;
        this.plantSpeedMultiplier = 1;

        this.cooldowns = Object.fromEntries(Object.keys(PLANT_COOLDOWNS).map(k => [k, 0]));

        this.waves = generateWaves();
        this.waveIndex = 0;
        this.waveTimer = 5000;
        this.zombiesSpawnedInWave = 0;
        this.waveSpawnTimer = 0;
    }

    init() {
        this.createGridVisuals();
        setupEventListeners(this);
        updateSunDisplay(this);
        setupTooltip();
        // Apply tooltips to seed cards now that the DOM is in place.
        document.querySelectorAll('.seed-packet[data-plant]').forEach((p) => {
            const tip = PLANT_TIPS[p.dataset.plant];
            if (tip) p.dataset.tip = tip;
        });
        const shovel = document.getElementById('shovel-btn');
        if (shovel) shovel.dataset.tip = '铲子 — 移除已种植物（可连续移除）';
    }

    createGridVisuals() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.style.left = `${col * this.cellWidth}px`;
                cell.style.top = `${row * this.cellHeight}px`;
                cell.dataset.row = row;
                cell.dataset.col = col;
                if ((row + col) % 2 === 1) cell.style.backgroundColor = 'rgba(0, 50, 0, 0.1)';
                this.board.appendChild(cell);
            }
        }
    }

    setupLawnmowers() {
        this.lawnmowers.forEach(lm => lm.element && lm.element.remove());
        this.lawnmowers = [];
        for (let row = 0; row < this.height; row++) {
            const el = document.createElement('div');
            el.className = 'lawnmower';
            el.textContent = '🚜';
            el.dataset.tip = LAWNMOWER_TIP;
            el.style.left = `${LAWNMOWER_X}px`;
            el.style.top = `${row * this.cellHeight + 30}px`;
            this.board.appendChild(el);
            this.lawnmowers.push({ row, x: LAWNMOWER_X, active: false, gone: false, element: el });
        }
    }

    togglePause() {
        if (!this.isRunning && !this.paused) return;
        this.paused = !this.paused;
        if (this.paused) {
            this.isRunning = false;
            this.sound.stopBGM();
            let overlay = document.getElementById('pause-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'pause-overlay';
                overlay.textContent = '⏸ 已暂停  按空格继续';
                document.getElementById('game-container').appendChild(overlay);
            }
            overlay.style.display = 'flex';
        } else {
            this.isRunning = true;
            this.lastTime = performance.now();
            this.sound.startBGM();
            const overlay = document.getElementById('pause-overlay');
            if (overlay) overlay.style.display = 'none';
            if (this.pendingCannon) {
                const { plant, x, y, zombie, wandererIdx } = this.pendingCannon;
                this.pendingCannon = null;
                fireCannon(this, plant, x, y, zombie, wandererIdx);
            }
            requestAnimationFrame((ts) => this.gameLoop(ts));
        }
    }

    readSettings() {
        const speedSlider = document.getElementById('zombie-speed');
        if (speedSlider) this.zombieSpeedMultiplier = parseFloat(speedSlider.value);

        const sunBtn = document.querySelector('#sun-setting .opt-btn.active');
        const sunVal = sunBtn ? sunBtn.dataset.value : 'Infinity';
        this.suns = sunVal === 'Infinity' ? Infinity : parseInt(sunVal);

        const waveBtn = document.querySelector('#wave-setting .opt-btn.active');
        this.waveCountSetting = waveBtn ? parseInt(waveBtn.dataset.value) : 6;

        const zombieBtn = document.querySelector('#zombie-count-setting .opt-btn.active');
        this.zombieCountMultiplier = zombieBtn ? parseFloat(zombieBtn.dataset.value) : 1;

        const bulletBtn = document.querySelector('#random-bullets-setting .opt-btn.active');
        this.randomBullets = bulletBtn ? bulletBtn.dataset.value === 'true' : false;

        this.waves = generateWaves(this.zombieCountMultiplier, this.waveCountSetting);
    }

    start() {
        this.readSettings();
        updateSunDisplay(this);
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('victory-screen').classList.add('hidden');
        this.isRunning = true;
        this.lastTime = performance.now();
        this.sound.startBGM();
        this.setupLawnmowers();

        if (this.firstGame && !this.wandererMode) {
            this.firstGame = false;
            this.waveIndex = this.waves.length;
            this.updateProgressBar();
            setTimeout(() => this.victory(), 500);
        }

        const plantTypes = ['peashooter', 'wallnut', 'pitcher', 'glue', 'obsidian'];
        for (let row = 0; row < this.height; row++) {
            if (this.grid[row][0].length === 0) {
                const type = plantTypes[Math.floor(Math.random() * plantTypes.length)];
                spawnPlant(this, row, 0, type);
            }
        }

        if (this.wandererMode) {
            this.waveIndex = this.waves.length;
            const bH = this.height * this.cellHeight;
            this.wandererSystem = new WandererSystem(10, this.boardWidth, bH, this.cellWidth, this.cellHeight);
        }

        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    restart() {
        this.sound.stopBGM();
        this.wandererSystem?.destroy();
        this.wandererSystem = null;
        this.plants.forEach(p => p.remove());
        this.zombies.forEach(z => z.remove());
        this.projectiles.forEach(p => p.remove());
        this.fallingSuns.forEach(s => s.remove());
        this.lawnmowers.forEach(lm => lm.element && lm.element.remove());
        this.board.querySelectorAll('.sun').forEach(s => s.remove());
        this.cannonIntervals.forEach(id => clearInterval(id));

        setEmojiCursor(null);
        this._resetGameState();

        updateSunDisplay(this);
        this.updateProgressBar();
        this.start();
    }

    goHome() {
        this.sound.stopBGM();
        this.wandererSystem?.destroy();
        this.wandererSystem = null;
        this.plants.forEach(p => p.remove());
        this.zombies.forEach(z => z.remove());
        this.projectiles.forEach(p => p.remove());
        this.fallingSuns.forEach(s => s.remove());
        this.lawnmowers.forEach(lm => lm.element && lm.element.remove());
        this.board.querySelectorAll('.sun').forEach(s => s.remove());
        this.cannonIntervals.forEach(id => clearInterval(id));
        setEmojiCursor(null);
        this._resetGameState();
        updateSunDisplay(this);
        this.updateProgressBar();
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('victory-screen').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        this.update(Math.min(deltaTime, 100));
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    update(deltaTime) {
        this.deltaTime = deltaTime;
        const clean = (arr) => arr.filter(e => !e.markedForDeletion);

        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                const stack = this.grid[r][c];
                if (stack.length === 0) continue;
                const top = stack[stack.length - 1];
                if (!top.markedForDeletion) { top._stackMult = stack.length; top.update(this); }
            }
        }

        this.zombies.forEach(z => z.update(this));
        this.zombies = clean(this.zombies);
        this.wandererSystem?.update(this);
        this.projectiles.forEach(p => p.update(this));
        this.projectiles = clean(this.projectiles);
        this.plants = clean(this.plants);

        if (this.randomBullets) {
            const types = ['normal', 'ice', 'piercing', 'gatling', 'waterdrop'];
            for (let k = 0; k < 5; k++) {
                const x = Math.random() * this.boardWidth;
                const y = Math.random() * this.height * this.cellHeight;
                spawnProjectile(this, x, y, types[Math.floor(Math.random() * types.length)]);
            }
        }

        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                const before = this.grid[r][c].length;
                this.grid[r][c] = this.grid[r][c].filter(p => !p.markedForDeletion);
                if (this.grid[r][c].length !== before) updateCellDisplay(this, r, c);
            }
        }

        this.timeSinceLastSun += deltaTime;
        if (this.timeSinceLastSun > 7000) {
            spawnSun(this, Math.random() * (this.boardWidth - 40), 0, 25);
            this.timeSinceLastSun = 0;
        }

        updateWaves(this, deltaTime);

        this.lawnmowers.forEach(lm => {
            if (lm.active) {
                lm.x += 6;
                lm.element.style.left = `${lm.x}px`;
                this.zombies.forEach(z => {
                    if (z.y === lm.row * this.cellHeight && Math.abs(z.x - lm.x) < 50) {
                        z.remove();
                        this.sound.playZombieDie();
                    }
                });
                if (lm.x > this.boardWidth + 50) {
                    lm.x = LAWNMOWER_X;
                    lm.active = false;
                    lm.element.style.left = `${LAWNMOWER_X}px`;
                }
            }
        });

        this.updateCooldowns(deltaTime);
        this.updateProgressBar();

        if (!this.wandererMode && this.waveIndex >= this.waves.length && this.zombies.length === 0 && !this.won) {
            this.won = true;
            setTimeout(() => this.victory(), 1000);
        }
    }

    updateCooldowns(deltaTime) {
        for (const type of Object.keys(this.cooldowns)) {
            if (this.cooldowns[type] > 0) {
                this.cooldowns[type] = Math.max(0, this.cooldowns[type] - deltaTime);
            }
            const packet = document.querySelector(`.seed-packet[data-plant="${type}"]`);
            if (!packet) continue;
            const overlay = packet.querySelector('.cooldown-overlay');
            if (this.cooldowns[type] > 0) {
                packet.classList.add('cooldown');
                if (overlay) overlay.style.height = `${(this.cooldowns[type] / PLANT_COOLDOWNS[type]) * 100}%`;
            } else {
                packet.classList.remove('cooldown');
                if (overlay) overlay.style.height = '0%';
            }
        }
    }

    updateProgressBar() {
        const fill = document.getElementById('progress-fill');
        if (fill) fill.style.width = `${Math.min(this.waveIndex / this.waves.length, 1) * 100}%`;
        const stats = document.getElementById('wave-stats');
        if (stats) {
            if (this.wandererMode) {
                stats.textContent = `漫游模式 · 场上 ${this.zombies.length}`;
            } else if (this.waveIndex >= this.waves.length) {
                stats.textContent = `全部 ${this.waves.length} 波已完成`;
            } else {
                const wave = this.waves[this.waveIndex];
                const total = getTotalZombiesInWave(wave);
                const remaining = (total - this.zombiesSpawnedInWave) + this.zombies.length;
                stats.textContent = `第 ${this.waveIndex + 1}/${this.waves.length} 波 · 剩 ${remaining} · 场上 ${this.zombies.length}`;
            }
        }
    }

    showNotEnoughFeedback(msg) {
        const el = document.createElement('div');
        el.className = 'flash-message';
        el.textContent = msg;
        document.getElementById('game-container').appendChild(el);
        setTimeout(() => el.remove(), 1500);
    }

    triggerLawnmower(row) {
        let lm = this.lawnmowers.find(l => l.row === row && !l.active);
        if (!lm) {
            const el = document.createElement('div');
            el.className = 'lawnmower';
            el.textContent = '🚜';
            el.dataset.tip = LAWNMOWER_TIP;
            el.style.left = `${LAWNMOWER_X}px`;
            el.style.top = `${row * this.cellHeight + 30}px`;
            this.board.appendChild(el);
            lm = { row, x: LAWNMOWER_X, active: false, gone: false, element: el };
            this.lawnmowers.push(lm);
        }
        lm.active = true;
        this.sound.playLawnmower();
    }

    gameOver() {
        this.isRunning = false;
        this.sound.playGameOver();
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    victory() {
        this.isRunning = false;
        this.sound.playVictory();
        const allTypes = ['peashooter', 'sunflower', 'wallnut', 'iceshooter', 'doubleshooter', 'pitcher', 'glue', 'obsidian'];
        const cells = [];
        for (let r = 0; r < this.height; r++)
            for (let c = 0; c < this.width; c++) cells.push({ r, c });
        for (let i = cells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cells[i], cells[j]] = [cells[j], cells[i]];
        }
        for (let i = 0; i < Math.min(100, cells.length); i++) {
            const { r, c } = cells[i];
            spawnPlant(this, r, c, allTypes[Math.floor(Math.random() * allTypes.length)]);
        }
        document.getElementById('victory-screen').classList.remove('hidden');
    }
}

window.game = new Game();
