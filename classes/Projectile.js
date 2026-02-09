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
            this.damage = DMG;
        } else if (type === 'glue') {
            this.speed = 7;
            this.damage = DMG;
        } else if (type === 'obsidian') {
            this.speed = 8;
            this.damage = DMG;
        } else if (type === 'piercing') {
            this.speed = 6;
            this.damage = DMG;
        } else {
            this.speed = 5;
            this.damage = DMG;
        }
        let cssClass = 'projectile';
        if (type === 'gatling') cssClass = 'projectile gatling';
        if (type === 'ice') cssClass = 'projectile ice';
        if (type === 'piercing') cssClass = 'projectile piercing';
        if (type === 'glue') cssClass = 'projectile glue';
        if (type === 'obsidian') cssClass = 'projectile obsidian';
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
                zombie.health -= this.damage;
                if (this.type === 'ice') {
                    zombie.baseSpeed = zombie.baseSpeed * 0.5;
                    zombie.speed = zombie.baseSpeed;
                    if (zombie.element) {
                        zombie.element.style.filter = 'brightness(0.8) hue-rotate(180deg)';
                    }
                }
                if (this.type === 'glue') {
                    zombie.baseSpeed = 0.01;
                    zombie.speed = 0.01;
                    if (zombie.element) {
                        zombie.element.style.filter = 'brightness(0.3) sepia(1) hue-rotate(220deg)';
                    }
                }
                if (zombie.health <= 0) {
                    zombie.remove();
                    if (game.sound) game.sound.playZombieDie();
                }
                // Piercing/glue/obsidian projectiles don't stop
                if (this.type !== 'piercing' && this.type !== 'obsidian' && this.type !== 'glue') {
                    this.remove();
                    break;
                }
            }
        }
    }
}
