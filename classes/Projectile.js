import { Entity } from './Entity.js';

export class Projectile extends Entity {
    constructor(x, y) {
        super(x, y, 20, 20);
        this.speed = 5;
        this.damage = 25;
        this.createDOM('projectile', '');
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
                if (zombie.health <= 0) {
                    zombie.remove();
                }
                this.remove();
                break; // One hit per pea
            }
        }
    }
}
