import { Entity } from './Entity.js';
import { runPlantBehavior } from './PlantBehaviors.js';

export class Plant extends Entity {
    constructor(x, y, type) {
        super(x, y, 80, 100);
        this.type = type;
        this.timer = 0;

        if (type === 'wallnut') {
            this.health = 9999999;
            this.maxHealth = 9999999;
        } else if (type === 'glue') {
            this.health = 600;
            this.maxHealth = 600;
        } else if (type === 'obsidian') {
            this.health = 800;
            this.maxHealth = 800;
        } else if (type === 'gatling') {
            this.health = 1000;
            this.maxHealth = 1000;
        } else if (type === 'waterdrop') {
            this.health = 300;
            this.maxHealth = 300;
        } else if (type === 'corncannon') {
            this.health = 1000;
            this.maxHealth = 1000;
            this.cannonReady = true;
            this.cannonTimer = 0;
        } else {
            this.health = 100;
            this.maxHealth = 100;
        }

        this.count = 1;
        this.fusionLevel = 1;

        // Potato mine: starts unarmed, arms after 3 seconds
        this.armed = type !== 'potato';
        this.armTimer = 0;

        // Visuals
        const icons = {
            peashooter: '🌱', sunflower: '🌻', wallnut: '🌰',
            iceshooter: '❄️', doubleshooter: '🌿', cherry: '🍒', potato: '🥔',
            pitcher: '🎯', glue: '🧿', obsidian: '🗿', gatling: '🔫', waterdrop: '💧',
            corncannon: '🌽', primitivepea: '🌟', triplepea: '🌳',
            nutbowling: '🥥',
        };
        let icon = icons[type] || '';

        this.createDOM(`entity plant ${type}`, `<div class="plant-inner">${icon}</div>`);
    }

    levelUpFusion() {
        this.fusionLevel++;
        if (this.element) {
            let badge = this.element.querySelector('.fusion-badge');
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'fusion-badge';
                this.element.appendChild(badge);
            }
            badge.textContent = `⭐${this.fusionLevel}`;
            this.element.style.filter = `brightness(${1 + (this.fusionLevel - 1) * 0.3}) drop-shadow(0 0 ${this.fusionLevel * 4}px gold)`;
        }
    }

    update(game) {
        const stackMult = this._stackMult || 1;
        const ultimateMult = (this.ultimateMs && this.ultimateMs > 0) ? 20 : 1;
        this.timer += game.deltaTime * this.fusionLevel * stackMult * (game.plantSpeedMultiplier || 1) * ultimateMult;
        if (this.ultimateMs && this.ultimateMs > 0) {
            this.ultimateMs -= (game.deltaTime || 16);
            if (this.ultimateMs <= 0) {
                this.ultimateMs = 0;
                if (this.element) this.element.classList.remove('ultimate');
            }
        }

        runPlantBehavior(this, game);
    }

    takeDamage(amount, force = false) {
        if (this.type === 'wallnut' && !force) return;
        this.health -= amount;
        if (this.element) {
            this.element.classList.remove('hit');
            void this.element.offsetWidth;
            this.element.classList.add('hit');
            setTimeout(() => this.element?.classList.remove('hit'), 350);
        }
        if (this.health <= 0) {
            this.count--;
            if (this.count <= 0) {
                this.remove();
            } else {
                this.health = this.maxHealth;
                this.element.style.opacity = 1;
                this._updateBadge();
            }
        } else {
            this.element.style.opacity = 0.3 + (this.health / this.maxHealth) * 0.7;
        }
    }

    _updateBadge() {
        if (!this.element) return;
        let badge = this.element.querySelector('.plant-count-badge');
        if (this.count > 1) {
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'plant-count-badge';
                this.element.appendChild(badge);
            }
            badge.textContent = `×${this.count}`;
        } else if (badge) {
            badge.remove();
        }
    }
}
