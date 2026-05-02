import { Zombie } from './classes/Zombie.js';
import { SoundManager } from './classes/SoundManager.js';
import { PLANT_COOLDOWNS, setEmojiCursor } from './classes/Constants.js';
import { WandererSystem } from './classes/WandererSystem.js';
import { generateWaves, updateWaves, spawnZombie } from './classes/WaveManager.js';
import { setupEventListeners } from './classes/UIEvents.js';
import { hasEnemyInRow, hasAnyEnemy, spawnProjectile, cherryBomb, fireCannon, cannonExplosion, cannonAutoFire } from './classes/CombatManager.js';
import { spawnSun, collectSun, updateSunDisplay } from './classes/SunManager.js';
import { spawnPlant, removePlant, updateCellDisplay, handleGridClick } from './classes/PlantManager.js';

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
        this.plantCount = 1;
        this.zombieSpeedMultiplier = 1;
        this.randomBullets = false;
        this.plantSpeedMultiplier = 1;
        this.sound = new SoundManager();
        this.firstGame = true;

        this.cooldowns = {
            peashooter: 0, sunflower: 0, wallnut: 0, iceshooter: 0,
            doubleshooter: 0, cherry: 0, potato: 0, pitcher: 0,
            glue: 0, obsidian: 0, gatling: 0,
        };

        this.waves = generateWaves();
        this.waveIndex = 0;
        this.waveTimer = 50;
        this.zombiesSpawnedInWave = 0;
        this.waveSpawnTimer = 0;

        this.init();
    }

    init() {
        this.createGridVisuals();
        setupEventListeners(this);
        this.updateSunDisplay();
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
            el.style.left = '-40px';
            el.style.top = `${row * this.cellHeight + 30}px`;
            this.board.appendChild(el);
            this.lawnmowers.push({ row, x: -40, active: false, gone: false, element: el });
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
                this.fireCannon(plant, x, y, zombie, wandererIdx);
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
        this.updateSunDisplay();
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
                this.spawnPlant(row, 0, type);
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

        this.plants = [];
        this.zombies = [];
        this.projectiles = [];
        this.fallingSuns = [];
        this.lawnmowers = [];
        this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(null).map(() => []));
        this.won = false;
        this.selectedPlant = null;
        this.shovelMode = false;
        setEmojiCursor(null);
        this.waveIndex = 0;
        this.waveTimer = 5000;
        this.zombiesSpawnedInWave = 0;
        this.waveSpawnTimer = 0;
        this.timeSinceLastSun = 0;
        this.cannonTarget = null;
        this.cannonIntervals.forEach(id => clearInterval(id));
        this.cannonIntervals = [];
        this.cooldowns = {
            peashooter: 0, sunflower: 0, wallnut: 0, iceshooter: 0,
            doubleshooter: 0, cherry: 0, potato: 0, pitcher: 0,
            glue: 0, obsidian: 0, gatling: 0, corncannon: 0,
        };

        this.updateSunDisplay();
        this.updateProgressBar();
        this.start();
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
                this.spawnProjectile(x, y, types[Math.floor(Math.random() * types.length)]);
            }
        }

        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                const before = this.grid[r][c].length;
                this.grid[r][c] = this.grid[r][c].filter(p => !p.markedForDeletion);
                if (this.grid[r][c].length !== before) this.updateCellDisplay(r, c);
            }
        }

        this.timeSinceLastSun += deltaTime;
        if (this.timeSinceLastSun > 7000) {
            this.spawnSun(Math.random() * (this.boardWidth - 40), 0, 25);
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
                if (lm.x > this.boardWidth + 50) { lm.element.remove(); lm.gone = true; }
            }
        });
        this.lawnmowers = this.lawnmowers.filter(lm => !lm.gone);

        this.updateCooldowns(deltaTime);

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
    }

    showNotEnoughFeedback(msg) {
        const el = document.createElement('div');
        el.className = 'flash-message';
        el.textContent = msg;
        document.getElementById('game-container').appendChild(el);
        setTimeout(() => el.remove(), 1500);
    }

    triggerLawnmower(row) {
        const lm = this.lawnmowers.find(l => l.row === row && !l.active);
        if (lm) { lm.active = true; this.sound.playLawnmower(); }
        else { this.gameOver(); }
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
            this.spawnPlant(r, c, allTypes[Math.floor(Math.random() * allTypes.length)]);
        }
        document.getElementById('victory-screen').classList.remove('hidden');
    }

    // ── Delegations to extracted modules ────────────────────────────────────
    spawnPlant(row, col, type)              { return spawnPlant(this, row, col, type); }
    removePlant(row, col)                   { removePlant(this, row, col); }
    updateCellDisplay(row, col)             { updateCellDisplay(this, row, col); }
    handleGridClick(row, col)               { handleGridClick(this, row, col); }

    spawnSun(x, startY, value)              { spawnSun(this, x, startY, value); }
    collectSun(sunEl)                       { collectSun(this, sunEl); }
    updateSunDisplay()                      { updateSunDisplay(this); }

    hasEnemyInRow(row, minX)               { return hasEnemyInRow(this, row, minX); }
    hasAnyEnemy(minX)                       { return hasAnyEnemy(this, minX); }
    spawnProjectile(x, y, type)            { spawnProjectile(this, x, y, type); }
    cherryBomb(plantX, plantY)             { cherryBomb(this, plantX, plantY); }
    fireCannon(plant, tx, ty, tz, wi)      { fireCannon(this, plant, tx, ty, tz, wi); }
    cannonExplosion(tz, wi)                { cannonExplosion(this, tz, wi); }
    cannonAutoFire(plantX, plantY)         { cannonAutoFire(this, plantX, plantY); }

    spawnZombie(row, type = 'normal')      { spawnZombie(this, row, type); }
}

window.game = new Game();
