import { Entity } from './Entity.js';

const ZOMBIE_CONFIG = {
    normal: { health: 100, speed: 0.2, icon: '🧟' },
    cone:   { health: 200, speed: 0.2, icon: '🧟‍♂️' },
    bucket: { health: 400, speed: 0.15, icon: '🧟‍♀️' },
};

export class Zombie extends Entity {
    constructor(gameWidth, y, type = 'normal') {
        super(gameWidth, y, 80, 100);
        const cfg = ZOMBIE_CONFIG[type] || ZOMBIE_CONFIG.normal;
        this.type = type;
        this.baseSpeed = cfg.speed;
        this.speed = cfg.speed;
        this.health = cfg.health;
        this.maxHealth = cfg.health;
        this.damage = 0.5;
        this.eating = false;

        let label = cfg.icon;
        if (type === 'cone') label = '🔶🧟';
        if (type === 'bucket') label = '🪣🧟';

        this.createDOM(`entity zombie zombie-${type}`, `<div class="zombie-inner">${label}</div>`);
    }

    update(game) {
        if (this.x < 0) {
            game.triggerLawnmower(Math.floor(this.y / 100));
            this.remove();
            return;
        }

        const col = Math.floor((this.x + 40) / 80);
        const row = Math.floor(this.y / 100);

        const plant = game.grid[row] && game.grid[row][col];

        if (plant) {
            this.eating = true;
            this.speed = 0;
            plant.takeDamage(this.damage);
            if (plant.markedForDeletion) {
                this.eating = false;
                this.speed = this.baseSpeed;
                game.grid[row][col] = null;
            }
        } else {
            this.eating = false;
            this.speed = this.baseSpeed;
        }

        this.x -= this.speed;
        this.draw();

        // Visual health indicator
        if (this.element) {
            const ratio = this.health / this.maxHealth;
            if (ratio < 0.3) {
                this.element.style.filter = 'hue-rotate(90deg)';
            }
        }
    }
}
