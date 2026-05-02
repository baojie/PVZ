import { Plant } from './classes/Plant.js';
import { Zombie } from './classes/Zombie.js';
import { Projectile } from './classes/Projectile.js';
import { SoundManager } from './classes/SoundManager.js';

/**
 * Plant vs Zombies - Web Version
 * Core Game Engine
 */

const PLANT_EMOJI = {
    peashooter: '🌱',
    sunflower: '🌻',
    wallnut: '🌰',
    iceshooter: '❄️',
    doubleshooter: '🌿',
    cherry: '🍒',
    potato: '🥔',
    pitcher: '🎯',
    glue: '🧿',
    obsidian: '🗿',
    gatling: '🔫',
    waterdrop: '💧',
    corncannon: '🌽',
    shovel: '🪏',
};

function setEmojiCursor(emoji) {
    if (!emoji) {
        document.body.style.cursor = '';
        return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 20, 22);
    document.body.style.cursor = `url(${canvas.toDataURL()}) 20 20, auto`;
}

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
    waterdrop: 0,
    corncannon: 0,
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
    waterdrop: 0,
    corncannon: 0,
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

        this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(null).map(() => []));

        this.selectedPlant = null;
        this.shovelMode = false;
        this.cannonTarget = null;
        this.pendingCannon = null;
        this.cannonIntervals = [];
        this.plantCount = 1;
        this.zombieSpeedMultiplier = 1;
        this.zombieBoost = false;
        this.randomBullets = false;
        this.plantSpeedMultiplier = 1;
        this.zombieBoostLevel = 1;
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
        const m = this.zombieCountMultiplier ?? 1;
        const n = this.waveCountSetting ?? 6;
        const sc = (v) => Math.max(1, Math.round(v * m));
        const allWaves = [
            { zombies: [{ type: 'normal', count: sc(500) }], interval: 50 },
            { zombies: [{ type: 'normal', count: sc(800) }, { type: 'newspaper', count: sc(300) }], interval: 45 },
            { zombies: [{ type: 'normal', count: sc(800) }, { type: 'cone', count: sc(500) }, { type: 'polevault', count: sc(200) }], interval: 40 },
            { zombies: [{ type: 'normal', count: sc(800) }, { type: 'cone', count: sc(800) }, { type: 'newspaper', count: sc(400) }], interval: 38 },
            { zombies: [{ type: 'normal', count: sc(600) }, { type: 'cone', count: sc(800) }, { type: 'bucket', count: sc(400) }, { type: 'polevault', count: sc(300) }], interval: 33 },
            { zombies: [{ type: 'normal', count: sc(1000) }, { type: 'cone', count: sc(1000) }, { type: 'bucket', count: sc(1000) }, { type: 'door', count: sc(300) }], interval: 25 },
            { zombies: [{ type: 'normal', count: sc(1200) }, { type: 'cone', count: sc(1200) }, { type: 'bucket', count: sc(600) }, { type: 'newspaper', count: sc(500) }, { type: 'door', count: sc(400) }], interval: 22 },
            { zombies: [{ type: 'normal', count: sc(800) }, { type: 'cone', count: sc(1500) }, { type: 'bucket', count: sc(1200) }, { type: 'polevault', count: sc(600) }, { type: 'door', count: sc(600) }], interval: 20 },
            { zombies: [{ type: 'normal', count: sc(2000) }, { type: 'cone', count: sc(2000) }, { type: 'bucket', count: sc(2000) }, { type: 'newspaper', count: sc(1000) }, { type: 'polevault', count: sc(800) }, { type: 'door', count: sc(800) }], interval: 18 },
        ];
        return allWaves.slice(0, n);
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

    setupEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => { this.fusionMode = false; this.wandererMode = false; this.start(); });
        document.getElementById('start-fusion-btn').addEventListener('click', () => { this.fusionMode = true; this.wandererMode = false; this.start(); });
        document.getElementById('start-wanderer-btn')?.addEventListener('click', () => { this.fusionMode = false; this.wandererMode = true; this.start(); });
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());
        document.getElementById('play-again-btn').addEventListener('click', () => this.restart());

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && document.getElementById('start-screen').classList.contains('hidden')) {
                e.preventDefault();
                this.togglePause();
            }
            if (e.code === 'KeyF' && this.isRunning) {
                this.plantSpeedMultiplier = (this.plantSpeedMultiplier || 1) * 3;
                this.showNotEnoughFeedback(`⚡ 植物加速 ×${this.plantSpeedMultiplier}`);
            }
            if (e.code === 'Escape') {
                this.selectedPlant = null;
                this.cannonTarget = null;
                this.cannonIntervals.forEach(id => clearInterval(id));
                this.cannonIntervals = [];
                document.querySelectorAll('.seed-packet').forEach(p => p.classList.remove('selected'));
                setEmojiCursor(null);
            }
        });

        // Sound toggle
        const soundBtn = document.getElementById('sound-toggle');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                this.sound.toggleMute();
                soundBtn.textContent = this.sound.muted ? '🔇' : '🔊';
            });
        }

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
            });
        });

        // Option button groups
        document.querySelectorAll('.btn-group').forEach(group => {
            group.querySelectorAll('.opt-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    group.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
        });

        const speedSlider = document.getElementById('zombie-speed');
        const speedLabel = document.getElementById('speed-label');
        const speedNames = { '0.5': '很慢', '1': '正常', '1.5': '快', '2': '很快', '2.5': '极快', '3': '噩梦' };
        if (speedSlider) {
            speedSlider.addEventListener('input', () => {
                speedLabel.textContent = speedNames[speedSlider.value] || `×${speedSlider.value}`;
            });
        }

        this.board.addEventListener('click', (e) => {
            if (!this.isRunning && !this.paused) return;

            if (!this.paused && e.target.classList.contains('sun')) {
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

            // Cannon targeting mode: must click on a zombie
            if (this.cannonTarget) {
                const rect = this.board.getBoundingClientRect();
                const tx = e.clientX - rect.left;
                const ty = e.clientY - rect.top;

                let hitX = null, hitY = null, hitZombie = null, hitWandererIdx = -1;
                for (const z of this.zombies) {
                    if (tx >= z.x && tx <= z.x + z.width && ty >= z.y && ty <= z.y + z.height) {
                        hitX = z.x + z.width / 2;
                        hitY = z.y + z.height / 2;
                        hitZombie = z;
                        break;
                    }
                }
                if (hitX === null && this.wandererSystem) {
                    const ws = this.wandererSystem;
                    for (let i = 0; i < ws.count; i++) {
                        if (tx >= ws.px[i] && tx <= ws.px[i] + 40 && ty >= ws.py[i] && ty <= ws.py[i] + 60) {
                            hitX = ws.px[i] + 20;
                            hitY = ws.py[i] + 30;
                            hitWandererIdx = i;
                            break;
                        }
                    }
                }
                if (hitX === null) return;

                if (this.paused) {
                    this.pendingCannon = { plant: this.cannonTarget, x: hitX, y: hitY, zombie: hitZombie, wandererIdx: hitWandererIdx };
                } else {
                    this.fireCannon(this.cannonTarget, hitX, hitY, hitZombie, hitWandererIdx);
                }
                // 保持瞄准模式，可继续选择其他僵尸；按 ESC 退出
                return;
            }

            // Click on a ready corncannon always arms it (takes priority over plant selection)
            const stack = this.grid[row][col];
            if (stack && stack.length > 0) {
                const top = stack[stack.length - 1];
                if (top.type === 'corncannon' && top.cannonReady) {
                    this.cannonTarget = top;
                    setEmojiCursor('🎯');
                    return;
                }
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
                setEmojiCursor(PLANT_EMOJI[this.selectedPlant]);
            });
        });

        // Shovel
        document.getElementById('shovel-btn').addEventListener('click', () => {
            this.shovelMode = !this.shovelMode;
            document.getElementById('shovel-btn').classList.toggle('selected', this.shovelMode);
            if (this.shovelMode) {
                this.selectedPlant = null;
                document.querySelectorAll('.seed-packet').forEach(p => p.classList.remove('selected'));
                setEmojiCursor(PLANT_EMOJI.shovel);
            } else {
                setEmojiCursor(null);
            }
        });

        // Plant count control
        const countInput = document.getElementById('plant-count-input');
        document.getElementById('plant-count-dec').addEventListener('click', () => {
            this.plantCount = Math.max(1, this.plantCount - 1);
            countInput.value = this.plantCount;
        });
        document.getElementById('plant-count-inc').addEventListener('click', () => {
            this.plantCount = Math.min(1000000, this.plantCount + 1);
            countInput.value = this.plantCount;
        });
        countInput.addEventListener('change', () => {
            this.plantCount = Math.min(1000000, Math.max(1, parseInt(countInput.value) || 1));
            countInput.value = this.plantCount;
        });
        countInput.addEventListener('click', (e) => e.stopPropagation());
    }

    readSettings() {
        const speedSlider = document.getElementById('zombie-speed');
        if (speedSlider) {
            this.zombieSpeedMultiplier = parseFloat(speedSlider.value);
        }

        const sunBtn = document.querySelector('#sun-setting .opt-btn.active');
        const sunVal = sunBtn ? sunBtn.dataset.value : 'Infinity';
        this.suns = sunVal === 'Infinity' ? Infinity : parseInt(sunVal);

        const waveBtn = document.querySelector('#wave-setting .opt-btn.active');
        this.waveCountSetting = waveBtn ? parseInt(waveBtn.dataset.value) : 6;

        const zombieBtn = document.querySelector('#zombie-count-setting .opt-btn.active');
        this.zombieCountMultiplier = zombieBtn ? parseFloat(zombieBtn.dataset.value) : 1;

        const bulletBtn = document.querySelector('#random-bullets-setting .opt-btn.active');
        this.randomBullets = bulletBtn ? bulletBtn.dataset.value === 'true' : false;

        this.waves = this.generateWaves();
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

        // Auto-win first game (not in wanderer mode)
        if (this.firstGame && !this.wandererMode) {
            this.firstGame = false;
            this.waveIndex = this.waves.length;
            this.updateProgressBar();
            setTimeout(() => this.victory(), 500);
        }

        // Auto-place random plants in the first column
        const plantTypes = ['peashooter', 'wallnut', 'pitcher', 'glue', 'obsidian'];
        for (let row = 0; row < this.height; row++) {
            if (this.grid[row][0].length === 0) {
                const type = plantTypes[Math.floor(Math.random() * plantTypes.length)];
                this.spawnPlant(row, 0, type);
            }
        }

        // Wanderer mode: 1,000,000 canvas-rendered wanderers
        if (this.wandererMode) {
            this.waveIndex = this.waves.length; // skip waves
            const bH = this.height * this.cellHeight;
            this.wandererSystem = new WandererSystem(
                10, this.boardWidth, bH, this.cellWidth, this.cellHeight
            );
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

        // Clear board children that are suns
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
        this.cooldowns = { peashooter: 0, sunflower: 0, wallnut: 0, iceshooter: 0, doubleshooter: 0, cherry: 0, potato: 0, pitcher: 0, glue: 0, obsidian: 0, gatling: 0, corncannon: 0 };

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

        // 只更新每格栈顶植物，栈深度作为速率乘数传入
        // 跳过被压住的植物：从 O(总植物数) 降到 O(格子数=45)
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                const stack = this.grid[r][c];
                if (stack.length === 0) continue;
                const top = stack[stack.length - 1];
                if (!top.markedForDeletion) {
                    top._stackMult = stack.length;
                    top.update(this);
                }
            }
        }

        this.zombies.forEach(z => z.update(this));
        this.zombies = clean(this.zombies);
        this.wandererSystem?.update(this);
        this.projectiles.forEach(p => p.update(this));
        this.projectiles = clean(this.projectiles);
        this.plants = clean(this.plants);

        // 全屏随机子弹（需开启选项）
        if (this.randomBullets) {
            const types = ['normal', 'ice', 'piercing', 'gatling', 'waterdrop'];
            for (let k = 0; k < 5; k++) {
                const x = Math.random() * this.boardWidth;
                const y = Math.random() * this.height * this.cellHeight;
                const type = types[Math.floor(Math.random() * types.length)];
                this.spawnProjectile(x, y, type);
            }
        }
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                const before = this.grid[r][c].length;
                this.grid[r][c] = this.grid[r][c].filter(p => !p.markedForDeletion);
                if (this.grid[r][c].length !== before) this.updateCellDisplay(r, c);
            }
        }

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
        if (!this.wandererMode && this.waveIndex >= this.waves.length && this.zombies.length === 0 && !this.won) {
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
        const cost = PLANT_COSTS[this.selectedPlant] || 0;

        if (this.cooldowns[this.selectedPlant] > 0) {
            this.showNotEnoughFeedback('冷却中!');
            return;
        }

        const n = this.plantCount ?? 1;
        const totalCost = cost * n;

        if (this.suns >= totalCost) {
            this.suns -= totalCost;
            this.updateSunDisplay();
            const stack = this.grid[row][col];
            const top = stack[stack.length - 1];
            if (this.fusionMode && top && !top.markedForDeletion && top.type === this.selectedPlant) {
                // 融合版：同类型升级
                for (let i = 0; i < n; i++) top.levelUpFusion();
            } else {
                // 普通版 / 不同类型：始终创建新植物入栈
                for (let i = 0; i < n; i++) {
                    this.spawnPlant(row, col, this.selectedPlant);
                }
            }
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

    updateCellDisplay(row, col) {
        const stack = this.grid[row][col];
        stack.forEach((p, i) => {
            if (p.element) p.element.style.visibility = i === stack.length - 1 ? '' : 'hidden';
        });
        const cellEl = this.board.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
        if (!cellEl) return;
        let badge = cellEl.querySelector('.stack-badge');
        if (stack.length > 1) {
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'stack-badge';
                cellEl.appendChild(badge);
            }
            badge.textContent = `×${stack.length}`;
        } else if (badge) {
            badge.remove();
        }
    }

    removePlant(row, col) {
        const stack = this.grid[row][col];
        if (stack && stack.length > 0) {
            stack.forEach(p => p.remove());
            stack.length = 0;
            this.updateCellDisplay(row, col);
        }
        this.shovelMode = false;
        document.getElementById('shovel-btn').classList.remove('selected');
    }

    spawnPlant(row, col, type) {
        const x = col * this.cellWidth;
        const y = row * this.cellHeight;
        const plant = new Plant(x, y, type);

        this.grid[row][col].push(plant);
        this.plants.push(plant);
        this.updateCellDisplay(row, col);
        return plant;
    }

    hasEnemyInRow(row, minX) {
        if (this.zombies.some(z => Math.floor(z.y / this.cellHeight) === row && z.x > minX)) return true;
        if (!this.wandererSystem) return false;
        const ws = this.wandererSystem;
        for (let i = 0; i < ws.count; i++) {
            if (Math.floor(ws.py[i] / this.cellHeight) === row && ws.px[i] > minX) return true;
        }
        return false;
    }

    hasAnyEnemy(minX) {
        if (this.zombies.some(z => z.x > minX)) return true;
        if (!this.wandererSystem) return false;
        const ws = this.wandererSystem;
        for (let i = 0; i < ws.count; i++) {
            if (ws.px[i] > minX) return true;
        }
        return false;
    }

    spawnWanderer() {
        const midY = Math.floor(this.height / 2) * this.cellHeight;
        const zombie = new Zombie(this.boardWidth, midY, 'normal', this.zombieSpeedMultiplier, true);
        zombie.x = (this.width - 1) * this.cellWidth;
        zombie.draw();
        this.zombies.push(zombie);
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

    fireCannon(plant, targetX, targetY, targetZombie, wandererIdx) {
        const INTERVAL = 5;
        const SHOW_EVERY = 20;
        let tick = 0;

        this.sound.playExplosion();

        const id = setInterval(() => {
            if (tick % SHOW_EVERY === 0) {
                const ox = (Math.random() - 0.5) * 10, oy = (Math.random() - 0.5) * 10;
                const ball = document.createElement('div');
                ball.style.cssText = `position:absolute;left:${plant.x+20}px;top:${plant.y+30}px;font-size:18px;z-index:25;pointer-events:none;transition:left 0.2s linear,top 0.2s linear;`;
                ball.textContent = '🌽';
                this.board.appendChild(ball);
                requestAnimationFrame(() => { ball.style.left = `${targetX-9+ox}px`; ball.style.top = `${targetY-9+oy}px`; });
                setTimeout(() => {
                    ball.remove();
                    const flash = document.createElement('div');
                    flash.style.cssText = `position:absolute;left:${targetX-20+ox}px;top:${targetY-20+oy}px;width:40px;height:40px;border-radius:50%;background:rgba(255,220,0,0.8);z-index:24;pointer-events:none;`;
                    this.board.appendChild(flash);
                    setTimeout(() => flash.remove(), 150);
                }, 200);
            }

            this.cannonExplosion(targetZombie, wandererIdx);
            tick++;
        }, INTERVAL);

        this.cannonIntervals.push(id);
    }

    cannonExplosion(targetZombie, wandererIdx) {
        const DMG = 1800;
        if (targetZombie && !targetZombie.markedForDeletion) {
            targetZombie.takeDamage(DMG);
            if (targetZombie.health <= 0) targetZombie.remove();
        } else if (wandererIdx >= 0 && this.wandererSystem) {
            const ws = this.wandererSystem;
            ws.hp[wandererIdx] -= DMG;
            if (ws.hp[wandererIdx] <= 0) {
                ws.hp[wandererIdx] = ws.maxHp;
                ws.vx[wandererIdx] = 0.8 + Math.random() * 0.8;
                ws.px[wandererIdx] = ws.W;
            }
        }
    }

    cannonAutoFire(plantX, plantY) {
        const DMG = 1800;
        for (const z of this.zombies) {
            if (!z.markedForDeletion) {
                z.takeDamage(DMG);
                if (z.health <= 0) z.remove();
            }
        }
        const ws = this.wandererSystem;
        if (ws) {
            for (let i = 0; i < ws.count; i++) {
                ws.hp[i] -= DMG;
                if (ws.hp[i] <= 0) {
                    ws.hp[i] = ws.maxHp;
                    ws.vx[i] = 0.8 + Math.random() * 0.8;
                    ws.px[i] = ws.W;
                }
            }
        }
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
                emptyCells.push({ r, c });
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

// ── WandererSystem ──────────────────────────────────────────────────────────
function _hslToRgb(h, s, l) {
    const hue2 = (p, q, t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [hue2(p, q, h + 1/3) * 255 | 0, hue2(p, q, h) * 255 | 0, hue2(p, q, h - 1/3) * 255 | 0];
}

class WandererSystem {
    constructor(count, boardWidth, boardHeight, cellWidth, cellHeight) {
        this.count = count;
        this.W = boardWidth; this.H = boardHeight;
        this.cW = cellWidth; this.cH = cellHeight;
        this.dmgTimer = 0;

        this.px = new Float32Array(count);
        this.py = new Float32Array(count);
        this.vx = new Float32Array(count);
        this.vy = new Float32Array(count);
        this.hp = new Float32Array(count);
        this.maxHp = Infinity;
        this.cr = new Uint8Array(count);
        this.cg = new Uint8Array(count);
        this.cb = new Uint8Array(count);
        this.dt = new Uint16Array(count);
        this.di = new Uint16Array(count);

        for (let i = 0; i < count; i++) {
            this.px[i] = Math.random() * boardWidth;
            this.py[i] = Math.random() * boardHeight;
            this.vx[i] = 0.8 + Math.random() * 0.8;
            this.hp[i] = this.maxHp;
            const spd = 1.5 + Math.random() * 2;
            this.vy[i] = Math.random() < 0.5 ? spd : -spd;
            const [r, g, b] = _hslToRgb(Math.random(), 0.9, 0.6);
            this.cr[i] = r; this.cg[i] = g; this.cb[i] = b;
            this.dt[i] = Math.random() * 120 | 0;
            this.di[i] = 60 + Math.random() * 120 | 0;
        }

        const canvas = document.createElement('canvas');
        canvas.width = boardWidth; canvas.height = boardHeight;
        canvas.style.cssText = 'position:absolute;left:0;top:0;z-index:18;pointer-events:none;';
        document.getElementById('game-board').appendChild(canvas);
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    update(game) {
        const { W, H, count, ctx } = this;
        const { px, py, vx, vy, cr, cg, cb, dt, di } = this;

        ctx.clearRect(0, 0, W, H);

        for (let i = 0; i < count; i++) {
            dt[i]++;
            if (dt[i] >= di[i]) {
                dt[i] = 0;
                di[i] = 60 + Math.random() * 120 | 0;
                const spd = 1.5 + Math.random() * 2;
                vy[i] = Math.random() < 0.5 ? spd : -spd;
            }
            px[i] -= vx[i];
            if (px[i] < -40) px[i] = W;
            // 碰到坚果就停在其右侧
            const wCol = Math.floor(px[i] / this.cW);
            const wRow = Math.floor((py[i] + 30) / this.cH);
            if (wRow >= 0 && wRow < game.height && wCol >= 0 && wCol < game.width) {
                const stack = game.grid[wRow][wCol];
                if (stack.length > 0 && stack[stack.length - 1].type === 'wallnut' && !stack[stack.length - 1].markedForDeletion) {
                    px[i] = (wCol + 1) * this.cW;
                }
            }
            py[i] += vy[i];
            if (py[i] >= H - 60) { py[i] = H - 60; vy[i] = -Math.abs(vy[i]); }
            if (py[i] <  0)      { py[i] = 0;       vy[i] =  Math.abs(vy[i]); }

            const xi = px[i], yi = py[i];
            const color = `rgb(${cr[i]},${cg[i]},${cb[i]})`;
            ctx.shadowBlur = 24;
            ctx.shadowColor = color;
            ctx.font = '36px serif';
            ctx.textAlign = 'center';
            ctx.fillText('👾', xi + 20, yi + 46);
            ctx.shadowBlur = 0;
        }

        // 每 30 帧批量伤害植物
        if (++this.dmgTimer < 30) return;
        this.dmgTimer = 0;
        const rows = game.height, cols = game.width;
        const cnt = new Int32Array(rows * cols);
        for (let i = 0; i < count; i++) {
            const c = px[i] / this.cW | 0, r = py[i] / this.cH | 0;
            if (r >= 0 && r < rows && c >= 0 && c < cols) cnt[r * cols + c]++;
        }
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const n = cnt[r * cols + c];
                if (!n) continue;
                const stack = game.grid[r][c];
                if (!stack.length) continue;
                const plant = stack[stack.length - 1];
                if (!plant.markedForDeletion) plant.takeDamage(n, true);
            }
        }
    }

    destroy() { this.canvas.remove(); }
}
// ────────────────────────────────────────────────────────────────────────────

window.game = new Game();
