import { Entity } from './Entity.js';

export class Zombie extends Entity {
    constructor(gameWidth, y) {
        super(gameWidth, y, 80, 100);
        this.speed = 0.2; // Pixels per frame
        this.health = 100;
        this.damage = 0.5; // Damage per frame to plants
        this.eating = false;
        
        this.createDOM('entity zombie', '<div class="zombie-inner">🧟</div>');
    }

    update(game) {
        if (this.x < 0) {
            game.gameOver();
            return;
        }

        // Collision Check with Plants
        // Simple check: same grid cell equivalent
        // Grid cell width is 80.
        // We can check if `this.x` is overlapping with a plant's column
        const col = Math.floor((this.x + 40) / 80); // Center point
        const row = Math.floor(this.y / 100);
        
        const plant = game.grid[row] && game.grid[row][col];
        
        if (plant) {
            this.eating = true;
            this.speed = 0;
            plant.takeDamage(this.damage);
            if (plant.markedForDeletion) {
                // Plant died, resume walking
                this.eating = false;
                this.speed = 0.2;
                game.grid[row][col] = null; // Clear grid
            }
        } else {
            this.eating = false;
            this.speed = 0.2;
        }

        this.x -= this.speed;
        this.draw();
    }
}
