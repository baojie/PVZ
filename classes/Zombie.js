import { Entity } from './Entity.js';

const ZOMBIE_CONFIG = {
    normal:    { health: 99999, speed: 0.2,  icon: '🧟' },
    cone:      { health: 99999, speed: 0.2,  icon: '🧟‍♂️' },
    bucket:    { health: 99999, speed: 0.15, icon: '🧟‍♀️' },
    newspaper: { health: 99999, speed: 0.2,  icon: '📰🧟' },
    polevault: { health: 99999, speed: 0.35, icon: '🎿🧟' },
    door:      { health: 99999, speed: 0.12, icon: '🚪🧟' },
};

export class Zombie extends Entity {
    constructor(gameWidth, y, type = 'normal', speedMultiplier = 1, wanderer = false) {
        super(gameWidth, y, 80, 100);
        const cfg = ZOMBIE_CONFIG[type] || ZOMBIE_CONFIG.normal;
        this.type = type;
        this.gameWidth = gameWidth;
        this.wanderer = wanderer;
        this.baseSpeed = wanderer ? 1.2 : cfg.speed * speedMultiplier;
        this.speed = this.baseSpeed;
        this.health = wanderer ? 99999 : cfg.health;
        this.maxHealth = this.health;
        this.damage = wanderer ? 200 : 0.5;
        this.eating = false;

        // 报纸僵尸：报纸护盾，破损后加速
        if (type === 'newspaper') {
            this.newspaperHealth = 1;
        }

        // 撑杆跳僵尸：首次遇到植物时跳过
        if (type === 'polevault') {
            this.vaulted = false;
        }

        // 铁门僵尸：铁门护盾，破损后变普通
        if (type === 'door') {
            this.doorHealth = 2;
        }

        if (wanderer) {
            this.verticalSpeed = 1.5 + Math.random() * 2;
            this.verticalDir = Math.random() < 0.5 ? 1 : -1;
            this.dirChangeTimer = 0;
            this.dirChangeInterval = 60 + Math.random() * 120;
            this.color = Zombie.randomColor();
        }

        let label = wanderer ? '👾' : cfg.icon;
        if (!wanderer && type === 'cone')   label = '🔶🧟';
        if (!wanderer && type === 'bucket') label = '🪣🧟';

        this.createDOM(`entity zombie zombie-${type}${wanderer ? ' wanderer' : ''}`, `<div class="zombie-inner">${label}</div>`);
        if (wanderer && this.element) {
            this.element.style.setProperty('--wcolor', this.color);
            this.element.style.filter = `drop-shadow(0 0 12px ${this.color}) drop-shadow(0 0 24px ${this.color})`;
        }
    }

    // 统一伤害入口，支持盾牌机制
    takeDamage(amount) {
        if (this.type === 'newspaper' && this.newspaperHealth > 0) {
            this.newspaperHealth -= 1;
            if (this.newspaperHealth <= 0) {
                this.baseSpeed *= 2.5;
                this.speed = this.eating ? 0 : this.baseSpeed;
                this._setLabel('😡🧟');
            }
            return true;
        }

        if (this.type === 'door' && this.doorHealth > 0) {
            this.doorHealth -= 1;
            if (this.doorHealth <= 0) {
                this._setLabel('🧟');
            }
            return true;
        }

        this.health -= amount;
        return false;
    }

    _setLabel(label) {
        if (this.element) {
            const inner = this.element.querySelector('.zombie-inner');
            if (inner) inner.textContent = label;
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

        // 撑杆跳：首次遇到植物时跃过
        if (this.type === 'polevault' && !this.vaulted && plant && !plant.markedForDeletion) {
            this.vaulted = true;
            this.x -= 160; // 跳过这格，落到前一格
            this.baseSpeed = 0.25;
            this.speed = this.baseSpeed;
            this._setLabel('🧟');
            this.eating = false;
            this.draw();
            return;
        }

        if (plant && !plant.markedForDeletion) {
            this.eating = true;
            this.speed = 0;
            plant.takeDamage(this.damage);
            if (this.element) this.element.classList.add('eating');
        } else {
            this.eating = false;
            this.speed = this.baseSpeed;
            if (this.element) this.element.classList.remove('eating');
        }

        this.x -= this.speed;
        this.draw();

        if (this.element) {
            const ratio = this.health / this.maxHealth;
            if (ratio < 0.3) this.element.style.filter = 'hue-rotate(90deg)';
        }
    }

    _updateWanderer(game) {
        if (this.health <= 0) {
            this.remove();
            game.spawnWanderer();
            return;
        }

        // 随机换向计时
        this.dirChangeTimer++;
        if (this.dirChangeTimer >= this.dirChangeInterval) {
            this.dirChangeTimer = 0;
            this.dirChangeInterval = 60 + Math.random() * 120;
            this.verticalDir = Math.random() < 0.5 ? 1 : -1;
            this.verticalSpeed = 1.5 + Math.random() * 2;
        }

        // 纵向弹跳
        this.y += this.verticalSpeed * this.verticalDir;
        const maxY = (game.height - 1) * game.cellHeight;
        if (this.y >= maxY) { this.y = maxY; this.verticalDir = -1; }
        if (this.y <= 0)    { this.y = 0;    this.verticalDir = 1; }

        const col = Math.floor((this.x + 40) / 80);
        const row = Math.floor((this.y + 50) / game.cellHeight);
        const stack = game.grid[row] && game.grid[row][col];
        const plant = stack && stack.length > 0 ? stack[stack.length - 1] : null;

        if (plant && !plant.markedForDeletion) {
            this.eating = true;
            plant.takeDamage(this.damage, true);
        } else {
            this.eating = false;
        }

        this.draw();

        if (this.element) {
            const ratio = this.health / this.maxHealth;
            this.element.style.opacity = 0.4 + ratio * 0.6;
        }
    }

    static randomColor() {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 90%, 60%)`;
    }
}
