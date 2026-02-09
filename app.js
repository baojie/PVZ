import { Plant } from './classes/Plant.js';
import { Zombie } from './classes/Zombie.js';
import { Projectile } from './classes/Projectile.js';
import { SoundManager } from './classes/SoundManager.js';

/**
 * Plant vs Zombies - Web Version
 * Core Game Engine
 */

const PLANT_COSTS = {
    peashooter: 0,
    sunflower: 0,
    wallnut: 0,
    iceshooter: 0,
    doubleshooter: 0,
    cherry: 0,
    potato: 0,
    pitcher: 0,
    glue: 0,
    obsidian: 0,
    gatling: 0,
};

const PLANT_COOLDOWNS = {
    peashooter: 0,
    sunflower: 0,
    wallnut: 0,
    iceshooter: 0,
    doubleshooter: 0,
    cherry: 0,
    potato: 0,
    pitcher: 0,
    glue: 0,
    obsidian: 0,
    gatling: 0,
};

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

        this.grid = Array(this.height).fill().map(() => Array(this.width).fill(null));

        this.selectedPlant = null;
        this.shovelMode = false;
        this.zombieSpeedMultiplier = 1;
        this.sound = new SoundManager();
        this.firstGame = true;

        // Cooldown timers
        this.cooldowns = {
            peashooter: 0,
            sunflower: 0,
            wallnut: 0,
            iceshooter: 0,
            doubleshooter: 0,
            cherry: 0,
            potato: 0,
            pitcher: 0,
            glue: 0,
            obsidian: 0,
            gatling: 0,
        };

        // Wave system
        this.waves = this.generateWaves();
        this.waveIndex = 0;
        this.waveTimer = 50; // Initial delay before first wave
        this.zombiesSpawnedInWave = 0;
        this.waveSpawnTimer = 0;

        this.init();
    }

    generateWaves() {
        return [
            { zombies: [{ type: 'normal', count: 500 }], interval: 50 },
            { zombies: [{ type: 'normal', count: 1000 }], interval: 40 },
            { zombies: [{ type: 'normal', count: 800 }, { type: 'cone', count: 700 }], interval: 40 },
            { zombies: [{ type: 'normal', count: 800 }, { type: 'cone', count: 1200 }], interval: 35 },
            { zombies: [{ type: 'normal', count: 600 }, { type: 'cone', count: 800 }, { type: 'bucket', count: 600 }], interval: 30 },
            { zombies: [{ type: 'normal', count: 1000 }, { type: 'cone', count: 1000 }, { type: 'bucket', count: 1000 }], interval: 25 },
        ];
    }

    getTotalZombiesInWave(wave) {
        return wave.zombies.reduce((sum, g) => sum + g.count, 0);
    }

    init() {
        this.createGridVisuals();
        this.setupEventListeners();
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

                if ((row + col) % 2 === 1) {
                    cell.style.backgroundColor = 'rgba(0, 50, 0, 0.1)';
                }

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

    setupEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => this.start());
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());
        document.getElementById('play-again-btn').addEventListener('click', () => this.restart());

        // Sound toggle
        const soundBtn = document.getElementById('sound-toggle');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                this.sound.toggleMute();
                soundBtn.textContent = this.sound.muted ? '🔇' : '🔊';
            });
        }

        const speedSlider = document.getElementById('zombie-speed');
        const speedLabel = document.getElementById('speed-label');
        const speedNames = { '0.5': '很慢', '1': '正常', '1.5': '快', '2': '很快', '2.5': '极快', '3': '噩梦' };
        if (speedSlider) {
            speedSlider.addEventListener('input', () => {
                speedLabel.textContent = speedNames[speedSlider.value] || `×${speedSlider.value}`;
            });
        }

        this.board.addEventListener('click', (e) => {
            if (!this.isRunning) return;

            if (e.target.classList.contains('sun')) {
                this.collectSun(e.target);
                return;
            }

            // Try grid cell first, then calculate from click coordinates
            const cell = e.target.closest('.grid-cell');
            let row, col;
            if (cell) {
                row = parseInt(cell.dataset.row);
                col = parseInt(cell.dataset.col);
            } else {
                // Calculate row/col from click position relative to board
                const rect = this.board.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                col = Math.floor(x / this.cellWidth);
                row = Math.floor(y / this.cellHeight);
                if (row < 0 || row >= this.height || col < 0 || col >= this.width) return;
            }

            if (this.shovelMode) {
                this.removePlant(row, col);
                return;
            }

            if (this.selectedPlant) {
                this.handleGridClick(row, col);
            }
        });

        // Seed Selection
        document.querySelectorAll('.seed-packet').forEach(packet => {
            if (packet.id === 'shovel-btn') return;
            packet.addEventListener('click', () => {
                if (packet.classList.contains('cooldown')) return;
                this.shovelMode = false;
                document.getElementById('shovel-btn').classList.remove('selected');
                document.querySelectorAll('.seed-packet').forEach(p => p.classList.remove('selected'));
                this.selectedPlant = packet.dataset.plant;
                packet.classList.add('selected');
            });
        });

        // Shovel
        document.getElementById('shovel-btn').addEventListener('click', () => {
            this.shovelMode = !this.shovelMode;
            document.getElementById('shovel-btn').classList.toggle('selected', this.shovelMode);
            if (this.shovelMode) {
                this.selectedPlant = null;
                document.querySelectorAll('.seed-packet').forEach(p => p.classList.remove('selected'));
            }
        });
    }

    start() {
        const speedSlider = document.getElementById('zombie-speed');
        if (speedSlider) {
            this.zombieSpeedMultiplier = parseFloat(speedSlider.value);
        }
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('victory-screen').classList.add('hidden');
        this.isRunning = true;
        this.lastTime = performance.now();
        this.sound.startBGM();
        this.setupLawnmowers();

        // Auto-win first game
        if (this.firstGame) {
            this.firstGame = false;
            this.waveIndex = this.waves.length;
            this.updateProgressBar();
            setTimeout(() => this.victory(), 500);
        }

        // Auto-place random plants in the first column
        const plantTypes = ['peashooter', 'wallnut', 'pitcher', 'glue', 'obsidian'];
        for (let row = 0; row < this.height; row++) {
            if (!this.grid[row][0]) {
                const type = plantTypes[Math.floor(Math.random() * plantTypes.length)];
                this.spawnPlant(row, 0, type);
            }
        }
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    restart() {
        this.sound.stopBGM();
        this.plants.forEach(p => p.remove());
        this.zombies.forEach(z => z.remove());
        this.projectiles.forEach(p => p.remove());
        this.fallingSuns.forEach(s => s.remove());
        this.lawnmowers.forEach(lm => lm.element && lm.element.remove());

        // Clear board children that are suns
        this.board.querySelectorAll('.sun').forEach(s => s.remove());

        this.plants = [];
        this.zombies = [];
        this.projectiles = [];
        this.fallingSuns = [];
        this.lawnmowers = [];
        this.grid = Array(this.height).fill().map(() => Array(this.width).fill(null));
        this.suns = Infinity;
        this.won = false;
        this.waveIndex = 0;
        this.waveTimer = 5000;
        this.zombiesSpawnedInWave = 0;
        this.waveSpawnTimer = 0;
        this.timeSinceLastSun = 0;
        this.cooldowns = { peashooter: 0, sunflower: 0, wallnut: 0, iceshooter: 0, doubleshooter: 0, cherry: 0, potato: 0, pitcher: 0, glue: 0, obsidian: 0, gatling: 0 };

        this.updateSunDisplay();
        this.updateProgressBar();
        this.start();
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;

        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Clamp deltaTime to prevent huge jumps on tab switch
        const clampedDT = Math.min(deltaTime, 100);
        this.update(clampedDT);

        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    update(deltaTime) {
        this.deltaTime = deltaTime;

        const clean = (arr) => arr.filter(e => !e.markedForDeletion);

        this.plants.forEach(p => p.update(this));
        this.zombies.forEach(z => z.update(this));
        this.zombies = clean(this.zombies);
        this.projectiles.forEach(p => p.update(this));
        this.projectiles = clean(this.projectiles);
        this.plants = clean(this.plants);

        // Natural Sun
        this.timeSinceLastSun += deltaTime;
        if (this.timeSinceLastSun > 7000) {
            this.spawnSun(Math.random() * (this.boardWidth - 40), 0, 25);
            this.timeSinceLastSun = 0;
        }

        // Waves
        this.updateWaves(deltaTime);

        // Lawnmowers
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
                    lm.element.remove();
                    lm.gone = true;
                }
            }
        });
        this.lawnmowers = this.lawnmowers.filter(lm => !lm.gone);

        // Cooldowns
        this.updateCooldowns(deltaTime);

        // Win check
        if (this.waveIndex >= this.waves.length && this.zombies.length === 0 && !this.won) {
            this.won = true;
            setTimeout(() => this.victory(), 1000);
        }
    }

    updateWaves(deltaTime) {
        if (this.waveIndex >= this.waves.length) return;

        this.waveTimer -= deltaTime;
        if (this.waveTimer > 0) return;

        const wave = this.waves[this.waveIndex];
        const totalZombies = this.getTotalZombiesInWave(wave);

        this.waveSpawnTimer -= deltaTime;
        if (this.waveSpawnTimer <= 0 && this.zombiesSpawnedInWave < totalZombies) {
            // Pick a zombie type based on remaining counts
            const pool = [];
            for (const group of wave.zombies) {
                for (let i = 0; i < group.count; i++) {
                    pool.push(group.type);
                }
            }
            const type = pool[this.zombiesSpawnedInWave] || 'normal';
            const row = Math.floor(Math.random() * this.height);
            this.spawnZombie(row, type);
            this.zombiesSpawnedInWave++;
            this.waveSpawnTimer = wave.interval;
        }

        if (this.zombiesSpawnedInWave >= totalZombies) {
            // Wait for all zombies in wave to be killed before next wave
            if (this.zombies.length === 0) {
                this.waveIndex++;
                this.zombiesSpawnedInWave = 0;
                this.waveTimer = 80; // Delay between waves
                this.updateProgressBar();
            }
        }
    }

    updateCooldowns(deltaTime) {
        for (const type of Object.keys(this.cooldowns)) {
            if (this.cooldowns[type] > 0) {
                this.cooldowns[type] -= deltaTime;
                if (this.cooldowns[type] <= 0) {
                    this.cooldowns[type] = 0;
                }
            }

            const packet = document.querySelector(`.seed-packet[data-plant="${type}"]`);
            if (!packet) continue;
            const overlay = packet.querySelector('.cooldown-overlay');

            if (this.cooldowns[type] > 0) {
                packet.classList.add('cooldown');
                if (overlay) {
                    const ratio = this.cooldowns[type] / PLANT_COOLDOWNS[type];
                    overlay.style.height = `${ratio * 100}%`;
                }
            } else {
                packet.classList.remove('cooldown');
                if (overlay) overlay.style.height = '0%';
            }
        }
    }

    updateProgressBar() {
        const total = this.waves.length;
        const progress = Math.min(this.waveIndex / total, 1);
        const fill = document.getElementById('progress-fill');
        if (fill) {
            fill.style.width = `${progress * 100}%`;
        }
    }

    handleGridClick(row, col) {
        if (this.grid[row][col]) return;

        const cost = PLANT_COSTS[this.selectedPlant] || 0;

        if (this.cooldowns[this.selectedPlant] > 0) {
            this.showNotEnoughFeedback('冷却中!');
            return;
        }

        if (this.suns >= cost) {
            this.suns -= cost;
            this.updateSunDisplay();
            this.spawnPlant(row, col, this.selectedPlant);
            this.cooldowns[this.selectedPlant] = PLANT_COOLDOWNS[this.selectedPlant];
            this.sound.playPlant();
        } else {
            this.showNotEnoughFeedback('阳光不足!');
        }
    }

    showNotEnoughFeedback(msg) {
        const el = document.createElement('div');
        el.className = 'flash-message';
        el.textContent = msg;
        document.getElementById('game-container').appendChild(el);
        setTimeout(() => el.remove(), 1500);
    }

    removePlant(row, col) {
        const plant = this.grid[row][col];
        if (plant) {
            plant.remove();
            this.grid[row][col] = null;
        }
        this.shovelMode = false;
        document.getElementById('shovel-btn').classList.remove('selected');
    }

    spawnPlant(row, col, type) {
        const x = col * this.cellWidth;
        const y = row * this.cellHeight;
        const plant = new Plant(x, y, type);

        this.grid[row][col] = plant;
        this.plants.push(plant);
    }

    spawnZombie(row, type = 'normal') {
        const y = row * this.cellHeight;
        const zombie = new Zombie(this.boardWidth, y, type, this.zombieSpeedMultiplier);
        this.zombies.push(zombie);
    }

    cherryBomb(plantX, plantY) {
        // Kill all zombies in 3x3 area around the plant
        const centerRow = Math.floor(plantY / this.cellHeight);
        const centerCol = Math.floor(plantX / this.cellWidth);
        for (const zombie of this.zombies) {
            const zRow = Math.floor(zombie.y / this.cellHeight);
            const zCol = Math.floor((zombie.x + 40) / this.cellWidth);
            if (Math.abs(zRow - centerRow) <= 1 && Math.abs(zCol - centerCol) <= 1) {
                zombie.health = 0;
                zombie.remove();
            }
        }
        this.sound.playExplosion();
        // Visual explosion effect
        const el = document.createElement('div');
        el.className = 'flash-message';
        el.style.background = 'rgba(255, 100, 0, 0.9)';
        el.textContent = '💥 BOOM!';
        document.getElementById('game-container').appendChild(el);
        setTimeout(() => el.remove(), 1500);
    }

    spawnProjectile(x, y, type = 'normal') {
        const proj = new Projectile(x, y, type);
        this.projectiles.push(proj);
    }

    spawnSun(x, startY, value) {
        const sun = document.createElement('div');
        sun.classList.add('sun');
        sun.innerText = '☀️';
        sun.style.left = `${x}px`;
        sun.style.top = `${startY}px`;
        sun.dataset.value = value;

        this.board.appendChild(sun);

        const targetY = Math.random() * (this.board.offsetHeight - 100) + 50;

        setTimeout(() => {
            sun.style.top = `${targetY}px`;
        }, 100);

        // Auto-collect after 1 second
        setTimeout(() => {
            if (sun.parentNode) this.collectSun(sun);
        }, 1000);
    }

    collectSun(sunEl) {
        const value = parseInt(sunEl.dataset.value);
        this.suns += value;
        this.updateSunDisplay();
        this.sound.playCollectSun();

        sunEl.style.transition = 'all 0.5s ease-in';
        sunEl.style.top = '0px';
        sunEl.style.left = '0px';
        sunEl.style.opacity = '0';

        setTimeout(() => {
            sunEl.remove();
        }, 500);
    }

    updateSunDisplay() {
        this.sunCounter.innerText = this.suns === Infinity ? '∞' : Math.floor(this.suns);
    }

    triggerLawnmower(row) {
        const lm = this.lawnmowers.find(l => l.row === row && !l.active);
        if (lm) {
            lm.active = true;
            this.sound.playLawnmower();
        } else {
            this.gameOver();
        }
    }

    gameOver() {
        this.isRunning = false;
        this.sound.playGameOver();
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    victory() {
        this.isRunning = false;
        this.sound.playVictory();
        // Spawn 100 random plants across the board as celebration
        const allTypes = ['peashooter', 'sunflower', 'wallnut', 'iceshooter', 'doubleshooter', 'pitcher', 'glue', 'obsidian'];
        let planted = 0;
        const emptyCells = [];
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                if (!this.grid[r][c]) emptyCells.push({ r, c });
            }
        }
        // Shuffle
        for (let i = emptyCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]];
        }
        const count = Math.min(100, emptyCells.length);
        for (let i = 0; i < count; i++) {
            const { r, c } = emptyCells[i];
            const type = allTypes[Math.floor(Math.random() * allTypes.length)];
            this.spawnPlant(r, c, type);
        }
        document.getElementById('victory-screen').classList.remove('hidden');
    }
}

window.game = new Game();
