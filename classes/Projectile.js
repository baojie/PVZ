import { Entity } from './Entity.js';

// 弹道类型表：speed/damage/cssClass 是必填，其他字段按需附加。
// piercing=true 表示命中后不消失（贯穿）。Infinity 用作「秒杀」哨兵伤害。
const PROJECTILE_TYPES = {
    normal:       { speed: 5,  damage: 20,       cssClass: 'projectile' },
    gatling:      { speed: 10, damage: Infinity, cssClass: 'projectile gatling' },
    ice:          { speed: 5,  damage: 20,       cssClass: 'projectile ice' },
    glue:         { speed: 7,  damage: Infinity, cssClass: 'projectile glue',         piercing: true },
    obsidian:     { speed: 8,  damage: Infinity, cssClass: 'projectile obsidian',     piercing: true },
    piercing:     { speed: 6,  damage: Infinity, cssClass: 'projectile piercing',     piercing: true },
    waterdrop:    { speed: 4,  damage: Infinity, cssClass: 'projectile waterdrop',    piercing: true },
    primitivepea: { speed: 6,  damage: 70,       cssClass: 'projectile primitivepea', stunMs: 2000 },
    bowling:      { speed: 12, damage: Infinity, cssClass: 'projectile bowling',      piercing: true, width: 56, height: 56 },
};

export class Projectile extends Entity {
    constructor(x, y, type = 'normal') {
        super(x, y, 20, 20);
        const cfg = PROJECTILE_TYPES[type] || PROJECTILE_TYPES.normal;
        this.type = type;
        this.speed = cfg.speed;
        this.damage = cfg.damage;
        this.piercing = !!cfg.piercing;
        if (cfg.stunMs) this.stunMs = cfg.stunMs;
        if (cfg.width) this.width = cfg.width;
        if (cfg.height) this.height = cfg.height;
        this.createDOM(cfg.cssClass, '');
    }

    update(game) {
        this.x += this.speed;
        this.draw();

        if (this.type === 'bowling' && this.ultimate) {
            const col = Math.floor(this.x / game.cellWidth);
            if (this._lastCol === undefined) this._lastCol = col - 1;
            if (col !== this._lastCol && col >= 0 && col < game.width) {
                this._lastCol = col;
                const row = Math.floor(this.y / 100);
                if (row >= 0 && row < game.height) {
                    const t = Math.random() < 0.5 ? 'potato' : 'cherry';
                    game.spawnPlant(row, col, t);
                }
            }
        }

        if (this.x > game.boardWidth) {
            this.remove();
            return;
        }

        // Collision with Zombies
        for (const zombie of game.zombies) {
            // Simple bounding box
            if (
                this.x < zombie.x + zombie.width &&
                this.x + this.width > zombie.x &&
                this.y < zombie.y + zombie.height &&
                this.y + this.height > zombie.y
            ) {
                const absorbed = zombie.takeDamage(this.damage);
                // 元始豌豆：眩晕 + 击退，不论是否被护盾吸收都生效
                if (this.type === 'primitivepea') {
                    zombie.stunTimer = Math.max(zombie.stunTimer || 0, this.stunMs);
                    zombie.x += 80;
                    const maxX = game.boardWidth - zombie.width;
                    if (zombie.x > maxX) zombie.x = maxX;
                    zombie.eating = false;
                    if (zombie.element) zombie.element.classList.remove('eating');
                    zombie.draw();
                }
                // 寒冰减速无论护盾是否吸收都生效
                if (this.type === 'ice') {
                    zombie.baseSpeed = Math.max(0.02, zombie.baseSpeed * 0.7);
                    if (!zombie.eating) zombie.speed = zombie.baseSpeed;
                    if (zombie.verticalSpeed !== undefined)
                        zombie.verticalSpeed = Math.max(0.1, zombie.verticalSpeed * 0.7);
                    if (zombie.element) zombie.element.style.filter = 'brightness(0.8) hue-rotate(180deg)';
                }
                if (!absorbed) {
                    if (this.type === 'glue') {
                        zombie.baseSpeed = 0.01;
                        zombie.speed = 0.01;
                        if (zombie.element) zombie.element.style.filter = 'brightness(0.3) sepia(1) hue-rotate(220deg)';
                    }
                    if (zombie.health <= 0) {
                        zombie.remove();
                        if (game.sound) game.sound.playZombieDie();
                    }
                }
                if (!this.piercing) {
                    this.remove();
                    break;
                }
            }
        }

        if (this.markedForDeletion) return;

        // Collision with WandererSystem
        const ws = game.wandererSystem;
        if (!ws) return;
        const { px, py } = ws;
        for (let i = 0; i < ws.count; i++) {
            if (
                this.x < px[i] + 40 &&
                this.x + this.width > px[i] &&
                this.y < py[i] + 60 &&
                this.y + this.height > py[i]
            ) {
                ws.hp[i] -= this.damage;
                if (this.type === 'ice') {
                    ws.vx[i] = 0;
                    ws.vy[i] = 0;
                }
                if (this.type === 'primitivepea') {
                    ws.stun[i] = Math.max(ws.stun[i] || 0, this.stunMs);
                    px[i] = Math.min(ws.W - 40, px[i] + 80);
                }
                if (ws.hp[i] <= 0) {
                    ws.hp[i] = ws.maxHp;
                    ws.vx[i] = 0.8 + Math.random() * 0.8;
                    px[i] = ws.W;
                }
                if (!this.piercing) {
                    this.remove();
                    break;
                }
            }
        }
    }
}
