import { Entity } from './Entity.js';
import { spawnPlant } from './PlantManager.js';
import { BOSS_SENTINEL_DAMAGE } from './Boss.js';
import { DAMAGE_CAP } from './CombatManager.js';

// 弹道类型表：speed/damage/cssClass 是必填，其他字段按需附加。
// piercing=true 表示命中后不消失（贯穿）。
//
// 每一颗子弹的伤害都是 17000（僵尸满血正好 800，所以对僵尸依旧是一发一个；
// 对 6400 万血的将王博士就是实打实的 17000 一发）。以前用 Infinity 当「秒杀
// 哨兵」的那几种弹（加特林 / 胶水 / 黑曜石 / 超级投手 / 水滴 / 保龄球）
// 一并改成 17000，不再需要对博士做折算。
export const BULLET_DAMAGE = 17000;

const PROJECTILE_TYPES = {
    normal:       { speed: 5,  damage: BULLET_DAMAGE, cssClass: 'projectile' },
    gatling:      { speed: 10, damage: BULLET_DAMAGE, cssClass: 'projectile gatling' },
    ice:          { speed: 5,  damage: BULLET_DAMAGE, cssClass: 'projectile ice' },
    glue:         { speed: 7,  damage: BULLET_DAMAGE, cssClass: 'projectile glue',         piercing: true },
    obsidian:     { speed: 8,  damage: BULLET_DAMAGE, cssClass: 'projectile obsidian',     piercing: true },
    piercing:     { speed: 6,  damage: BULLET_DAMAGE, cssClass: 'projectile piercing',     piercing: true },
    waterdrop:    { speed: 4,  damage: BULLET_DAMAGE, cssClass: 'projectile waterdrop',    piercing: true },
    primitivepea: { speed: 6,  damage: BULLET_DAMAGE, cssClass: 'projectile primitivepea', stunMs: 2000 },
    bowling:      { speed: 12, damage: BULLET_DAMAGE, cssClass: 'projectile bowling',      piercing: true, width: 56, height: 56 },
    cabbage:      { speed: 6,  damage: BULLET_DAMAGE, cssClass: 'projectile cabbage',      width: 28, height: 28 },
    mgpea:        { speed: 9,  damage: BULLET_DAMAGE, cssClass: 'projectile mgpea',        width: 14, height: 14 },
    scatterpea:   { speed: 7,  damage: BULLET_DAMAGE, cssClass: 'projectile scatterpea',   width: 12, height: 12 },
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
        // vy 由发射方按需设置（超级机枪的散射豌豆），飞出上下边界就回收
        if (this.vy) {
            this.y += this.vy;
            if (this.y < -this.height || this.y > game.height * game.cellHeight) {
                this.remove();
                return;
            }
        }
        this.draw();

        if (this.type === 'bowling' && this.ultimate) {
            const col = Math.floor(this.x / game.cellWidth);
            if (this._lastCol === undefined) this._lastCol = col - 1;
            if (col !== this._lastCol && col >= 0 && col < game.width) {
                this._lastCol = col;
                const row = Math.floor(this.y / 100);
                if (row >= 0 && row < game.height) {
                    const t = Math.random() < 0.5 ? 'potato' : 'cherry';
                    spawnPlant(game, row, col, t);
                }
            }
        }

        // 将王博士机甲：只有低头时才吃伤害，没低头就是够不着，子弹直接飞过去
        // 每颗子弹只能打博士一次。他有 190px 宽，穿透弹飞过去要几十帧，
        // 不卡这一下的话一颗水滴能连打 40 多次。
        const boss = game.boss;
        if (boss && !boss.markedForDeletion && boss.vulnerable && !this._hitBoss &&
            this.x + this.width > boss.x && this.x < boss.x + boss.width &&
            this.y + this.height > boss.y && this.y < boss.y + boss.height) {
            this._hitBoss = true;
            // 必杀弹对博士折算成实数，同样吃这颗子弹的递增倍率
            const dmg = this.damage === Infinity
                ? Math.min(BOSS_SENTINEL_DAMAGE * (this.damageMult || 1), DAMAGE_CAP)
                : this.damage;
            boss.takeDamage(dmg);
            if (!this.piercing) { this.remove(); return; }
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
