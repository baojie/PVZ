import { Entity } from './Entity.js';

export class Plant extends Entity {
    constructor(x, y, type) {
        super(x, y, 80, 100);
        this.type = type;
        this.timer = 0;

        if (type === 'wallnut') {
            this.health = 400;
            this.maxHealth = 400;
        } else {
            this.health = 100;
            this.maxHealth = 100;
        }

        // Visuals
        let icon = '';
        if (type === 'peashooter') icon = '🌱';
        if (type === 'sunflower') icon = '🌻';
        if (type === 'wallnut') icon = '🌰';

        this.createDOM(`entity plant ${type}`, `<div class="plant-inner">${icon}</div>`);
    }

    update(game) {
        this.timer += game.deltaTime;

        if (this.type === 'peashooter') {
            if (this.timer >= 2000) {
                this.timer = 0;
                const hasZombie = game.zombies.some(z =>
                    z.y === this.y && z.x > this.x
                );
                if (hasZombie) {
                    game.spawnProjectile(this.x + 40, this.y + 20);
                }
            }
        }

        if (this.type === 'sunflower') {
            if (this.timer >= 10000) {
                this.timer = 0;
                game.spawnSun(this.x, this.y, 25);
            }
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.remove();
        } else {
            this.element.style.opacity = 0.3 + (this.health / this.maxHealth) * 0.7;
            if (this.type === 'wallnut') {
                if (this.health < this.maxHealth * 0.33) {
                    this.element.querySelector('.plant-inner').textContent = '💀';
                } else if (this.health < this.maxHealth * 0.66) {
                    this.element.querySelector('.plant-inner').textContent = '🥜';
                }
            }
        }
    }
}
