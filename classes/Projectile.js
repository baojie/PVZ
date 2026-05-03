import { Entity } from './Entity.js';

export class Projectile extends Entity {
    constructor(x, y, type = 'normal') {
        super(x, y, 20, 20);
        this.type = type;
        const DMG = 1.2345678901234568e+49;
        if (type === 'gatling') {
            this.speed = 10;
            this.damage = DMG;
        } else if (type === 'ice') {
            this.speed = 5;
            this.damage = 20;
        } else if (type === 'glue') {
            this.speed = 7;
            this.damage = DMG;
        } else if (type === 'obsidian') {
            this.speed = 8;
            this.damage = DMG;
        } else if (type === 'piercing') {
            this.speed = 6;
            this.damage = DMG;
        } else if (type === 'waterdrop') {
            this.speed = 4;
            this.damage = Infinity;
        } else if (type === 'yuanshiwandou') {
            this.speed = 6;
            this.damage = 70;
            this.stunMs = 2000;
        } else {
            this.speed = 5;
            this.damage = 20;
        }
        let cssClass = 'projectile';
        if (type === 'gatling') cssClass = 'projectile gatling';
        if (type === 'ice') cssClass = 'projectile ice';
        if (type === 'piercing') cssClass = 'projectile piercing';
        if (type === 'glue') cssClass = 'projectile glue';
        if (type === 'obsidian') cssClass = 'projectile obsidian';
        if (type === 'waterdrop') cssClass = 'projectile waterdrop';
        if (type === 'yuanshiwandou') cssClass = 'projectile yuanshiwandou';
        this.createDOM(cssClass, '');
    }

    update(game) {
        this.x += this.speed;
        this.draw();

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
                if (this.type === 'yuanshiwandou') {
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
                // Piercing/glue/obsidian/waterdrop projectiles don't stop
                if (this.type !== 'piercing' && this.type !== 'obsidian' && this.type !== 'glue' && this.type !== 'waterdrop') {
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
                if (this.type === 'yuanshiwandou') {
                    ws.stun[i] = Math.max(ws.stun[i] || 0, this.stunMs);
                    px[i] = Math.min(ws.W - 40, px[i] + 80);
                }
                if (ws.hp[i] <= 0) {
                    ws.hp[i] = ws.maxHp;
                    ws.vx[i] = 0.8 + Math.random() * 0.8;
                    px[i] = ws.W;
                }
                if (this.type !== 'piercing' && this.type !== 'obsidian' && this.type !== 'glue' && this.type !== 'waterdrop') {
                    this.remove();
                    break;
                }
            }
        }
    }
}
