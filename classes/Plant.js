import { Entity } from './Entity.js';

export class Plant extends Entity {
    constructor(x, y, type) {
        super(x, y, 80, 100);
        this.type = type;
        this.health = 100;
        this.timer = 0;
        
        // Visuals
        let icon = '';
        if (type === 'peashooter') icon = '🌱'; // Placeholder
        if (type === 'sunflower') icon = '🌻';
        if (type === 'wallnut') icon = '🌰';
        
        this.createDOM(`entity plant ${type}`, `<div class="plant-inner">${icon}</div>`);
    }
    
    update(game) {
        this.timer++;
        
        if (this.type === 'peashooter') {
            // Shoot every 2 seconds (approx 120 frames at 60fps)
            if (this.timer % 120 === 0) {
                // Check if there is a zombie in the lane
                const hasZombie = game.zombies.some(z => 
                    z.y === this.y && z.x > this.x
                );
                if (hasZombie) {
                    game.spawnProjectile(this.x + 40, this.y + 20);
                }
            }
        }
        
        if (this.type === 'sunflower') {
            // Produce sun every 10 seconds
            if (this.timer % 600 === 0) {
                game.spawnSun(this.x, this.y, 25);
            }
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.remove();
        } else {
            // Visual feedback?
            this.element.style.opacity = this.health / 100;
        }
    }
}
