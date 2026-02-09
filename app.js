import { Plant } from './classes/Plant.js';
import { Zombie } from './classes/Zombie.js';
import { Projectile } from './classes/Projectile.js';

/**
 * Plant vs Zombies - Web Version
 * Core Game Engine
 */

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
        
        this.suns = 50;
        this.lastTime = 0;
        this.timeSinceLastSun = 0;
        this.timeSinceLastZombie = 0;
        this.isRunning = false;
        
        this.plants = [];
        this.zombies = [];
        this.projectiles = [];
        this.fallingSuns = [];
        
        // Grid state (null or plant object)
        this.grid = Array(this.height).fill().map(() => Array(this.width).fill(null));

        this.selectedPlant = null; // For seed selection binding
        this.draggedPlantType = null;

        this.init();
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
                
                // Checkerboard pattern visuals
                if ((row + col) % 2 === 1) {
                    cell.style.backgroundColor = 'rgba(0, 50, 0, 0.1)';
                }
                
                this.board.appendChild(cell);
            }
        }
    }

    setupEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => this.start());
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());
        
        // Handle Board Clicks (Planting)
        this.board.addEventListener('click', (e) => {
            if (!this.isRunning) return;
            const cell = e.target.closest('.grid-cell');
            // Also handle clicks on suns
            if (e.target.classList.contains('sun')) {
                this.collectSun(e.target);
                return;
            }

            if (cell && this.selectedPlant) {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                this.handleGridClick(row, col);
            }
        });

        // Seed Selection
        document.querySelectorAll('.seed-packet').forEach(packet => {
            packet.addEventListener('click', (e) => {
                // Deselect all
                document.querySelectorAll('.seed-packet').forEach(p => p.classList.remove('selected'));
                
                this.selectedPlant = packet.dataset.plant;
                packet.classList.add('selected');
                console.log('Selected plant:', this.selectedPlant);
            });
        });
    }

    start() {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
        console.log("Game Started");
    }

    restart() {
        // Clear everything
        this.plants.forEach(p => p.remove());
        this.zombies.forEach(z => z.remove());
        this.projectiles.forEach(p => p.remove());
        this.fallingSuns.forEach(s => s.remove());
        
        this.plants = [];
        this.zombies = [];
        this.projectiles = [];
        this.fallingSuns = [];
        this.grid = Array(this.height).fill().map(() => Array(this.width).fill(null));
        this.suns = 50;
        
        this.updateSunDisplay();
        this.start();
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;
        
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    update(deltaTime) {
        // Helper to remove marked entities
        const clean = (arr) => arr.filter(e => !e.markedForDeletion);

        // Update Entities
        this.plants.forEach(p => p.update(this));
        
        this.zombies.forEach(z => z.update(this));
        this.zombies = clean(this.zombies); // Remove dead zombies

        this.projectiles.forEach(p => p.update(this));
        this.projectiles = clean(this.projectiles);

        this.plants = clean(this.plants); // Remove dead plants

        // Natural Sun Generation (every 5 seconds approx)
        this.timeSinceLastSun += deltaTime;
        if (this.timeSinceLastSun > 5000) {
            this.spawnSun(Math.random() * (this.boardWidth - 40), 0, 25);
            this.timeSinceLastSun = 0;
        }

        // Zombie Spawning (Simple Wave Logic for now)
        this.timeSinceLastZombie += deltaTime;
        if (this.timeSinceLastZombie > 8000) { // Every 8 seconds
            const row = Math.floor(Math.random() * this.height);
            this.spawnZombie(row);
            this.timeSinceLastZombie = 0;
        }
    }

    draw() {
        // Render updates handled by DOM elements in classes
    }

    handleGridClick(row, col) {
        if (this.grid[row][col]) return; // Already occupied
        
        let cost = 0;
        if (this.selectedPlant === 'peashooter') cost = 100;
        if (this.selectedPlant === 'sunflower') cost = 50;
        if (this.selectedPlant === 'wallnut') cost = 50;

        if (this.suns >= cost) {
            this.suns -= cost;
            this.updateSunDisplay();
            this.spawnPlant(row, col, this.selectedPlant);
        } else {
            console.log("Not enough sun!");
            // TODO: Visual feedback
        }
    }

    spawnPlant(row, col, type) {
        const x = col * this.cellWidth;
        const y = row * this.cellHeight;
        const plant = new Plant(x, y, type);
        
        this.grid[row][col] = plant;
        this.plants.push(plant);
    }

    spawnZombie(row) {
        const y = row * this.cellHeight;
        const zombie = new Zombie(this.boardWidth, y);
        this.zombies.push(zombie);
    }

    spawnProjectile(x, y) {
        const proj = new Projectile(x, y);
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
        
        // Animate falling
        // Simple animation using CSS transition or JS interval
        // Let's use JS for now to update its position or just CSS transition to a random target
        const targetY = Math.random() * (this.board.offsetHeight - 100) + 50;
        
        setTimeout(() => {
            sun.style.top = `${targetY}px`;
        }, 100);

        // Auto remove after 10s if not collected
        setTimeout(() => {
            if (sun.parentNode) sun.remove();
        }, 10000);
    }

    collectSun(sunEl) {
        const value = parseInt(sunEl.dataset.value);
        this.suns += value;
        this.updateSunDisplay();
        
        // Fly up animation
        sunEl.style.transition = 'all 0.5s ease-in';
        sunEl.style.top = '0px';
        sunEl.style.left = '0px';
        sunEl.style.opacity = '0';
        
        setTimeout(() => {
            sunEl.remove();
        }, 500);
    }

    updateSunDisplay() {
        this.sunCounter.innerText = Math.floor(this.suns);
    }

    gameOver() {
        this.isRunning = false;
        document.getElementById('game-over-screen').classList.remove('hidden');
    }
}

// Start the game instance
window.game = new Game();
