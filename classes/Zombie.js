import { Entity } from './Entity.js';

const ZOMBIE_CONFIG = {
    normal: { health: 9876543221, speed: 0.2, icon: '🧟' },
    cone:   { health: 9876543221, speed: 0.2, icon: '🧟‍♂️' },
    bucket: { health: 9876543221, speed: 0.15, icon: '🧟‍♀️' },
};

export class Zombie extends Entity {
    constructor(gameWidth, y, type = 'normal', speedMultiplier = 1, wanderer = false) {
        super(gameWidth, y, 80, 100);
        const cfg = ZOMBIE_CONFIG[type] || ZOMBIE_CONFIG.normal;
        this.type = type;
        this.gameWidth = gameWidth;
        this.wanderer = wanderer;
        this.baseSpeed = cfg.speed * speedMultiplier;
        this.speed = this.baseSpeed;
        this.health = wanderer ? 9999 : cfg.health;
        this.maxHealth = this.health;
        this.damage = 0.5;
        this.eating = false;

        if (wanderer) {
            this.verticalSpeed = 0.6;
            this.verticalDir = 1;
            this.color = Zombie.randomColor();
        }

        let label = wanderer ? '👾' : cfg.icon;
        if (!wanderer && type === 'cone') label = '🔶🧟';
        if (!wanderer && type === 'bucket') label = '🪣🧟';

        this.createDOM(`entity zombie zombie-${type}${wanderer ? ' wanderer' : ''}`, `<div class="zombie-inner">${label}</div>`);
        if (wanderer && this.element) {
            this.element.style.setProperty('--wcolor', this.color);
            this.element.style.filter = `drop-shadow(0 0 12px ${this.color}) drop-shadow(0 0 24px ${this.color})`;
        }
    }

    update(game) {
        if (this.wanderer) {
            this._updateWanderer(game);
            return;
        }

        if (this.x < 0) {
            game.triggerLawnmower(Math.floor(this.y / 100));
            this.remove();
            return;
        }

        const col = Math.floor((this.x + 40) / 80);
        const row = Math.floor(this.y / 100);

        const stack = game.grid[row] && game.grid[row][col];
        const plant = stack && stack.length > 0 ? stack[stack.length - 1] : null;

        if (plant && !plant.markedForDeletion) {
            this.eating = true;
            this.speed = 0;
            plant.takeDamage(this.damage);
        } else {
            this.eating = false;
            this.speed = this.baseSpeed;
        }

        this.x -= this.speed;
        this.draw();

        if (this.element) {
            const ratio = this.health / this.maxHealth;
            if (ratio < 0.3) this.element.style.filter = 'hue-rotate(90deg)';
        }
    }

    _updateWanderer(game) {
        // Death check
        if (this.health <= 0) {
            this.remove();
            game.spawnWanderer();
            return;
        }

        // Wrap around when reaching left edge
        if (this.x < -80) {
            this.x = this.gameWidth;
        }

        // Vertical bounce
        this.y += this.verticalSpeed * this.verticalDir;
        const maxY = (game.height - 1) * game.cellHeight;
        if (this.y >= maxY) { this.y = maxY; this.verticalDir = -1; }
        if (this.y <= 0)    { this.y = 0;    this.verticalDir = 1; }

        // Eat plants in current cell
        const col = Math.floor((this.x + 40) / 80);
        const row = Math.floor((this.y + 50) / game.cellHeight);
        const stack = game.grid[row] && game.grid[row][col];
        const plant = stack && stack.length > 0 ? stack[stack.length - 1] : null;

        if (plant && !plant.markedForDeletion) {
            this.eating = true;
            this.speed = 0;
            plant.takeDamage(this.damage);
        } else {
            this.eating = false;
            this.speed = this.baseSpeed;
        }

        // Health bar tint
        if (this.element) {
            const ratio = this.health / this.maxHealth;
            this.element.style.opacity = 0.4 + ratio * 0.6;
        }

        this.x -= this.speed;
        this.draw();
    }

    static randomColor() {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 90%, 60%)`;
    }
}
