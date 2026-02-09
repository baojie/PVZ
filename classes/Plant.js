import { Entity } from './Entity.js';

export class Plant extends Entity {
    constructor(x, y, type) {
        super(x, y, 80, 100);
        this.type = type;
        this.timer = 0;

        if (type === 'wallnut') {
            this.health = 400;
            this.maxHealth = 400;
        } else if (type === 'glue') {
            this.health = 600;
            this.maxHealth = 600;
        } else if (type === 'obsidian') {
            this.health = 800;
            this.maxHealth = 800;
        } else if (type === 'gatling') {
            this.health = 1000;
            this.maxHealth = 1000;
        } else {
            this.health = 100;
            this.maxHealth = 100;
        }

        // Potato mine: starts unarmed, arms after 3 seconds
        this.armed = type !== 'potato';
        this.armTimer = 0;

        // Visuals
        const icons = {
            peashooter: '🌱', sunflower: '🌻', wallnut: '🌰',
            iceshooter: '❄️', doubleshooter: '🌿', cherry: '🍒', potato: '🥔',
            pitcher: '🎯', glue: '🧿', obsidian: '🗿', gatling: '🔫',
        };
        let icon = icons[type] || '';

        this.createDOM(`entity plant ${type}`, `<div class="plant-inner">${icon}</div>`);
    }

    update(game) {
        this.timer += game.deltaTime;

        if (this.type === 'peashooter') {
            if (this.timer >= 100) {
                this.timer = 0;
                const hasZombie = game.zombies.some(z =>
                    z.y === this.y && z.x > this.x
                );
                if (hasZombie) {
                    game.spawnProjectile(this.x + 40, this.y + 20);
                }
            }
        }

        if (this.type === 'pitcher') {
            if (this.timer >= 1500) {
                this.timer = 0;
                const hasZombie = game.zombies.some(z =>
                    z.y === this.y && z.x > this.x
                );
                if (hasZombie) {
                    game.spawnProjectile(this.x + 40, this.y + 20, 'piercing');
                }
            }
        }

        if (this.type === 'glue') {
            if (this.timer >= 500) {
                this.timer = 0;
                const hasZombie = game.zombies.some(z =>
                    z.y === this.y && z.x > this.x
                );
                if (hasZombie) {
                    game.spawnProjectile(this.x + 40, this.y + 20, 'glue');
                }
            }
        }

        if (this.type === 'obsidian') {
            if (this.timer >= 300) {
                this.timer = 0;
                const rows = [this.y - 100, this.y, this.y + 100];
                for (const rowY of rows) {
                    if (rowY < 0 || rowY >= 500) continue;
                    const hasZombie = game.zombies.some(z =>
                        z.y === rowY && z.x > this.x
                    );
                    if (hasZombie) {
                        game.spawnProjectile(this.x + 40, rowY + 20, 'obsidian');
                    }
                }
            }
        }

        if (this.type === 'iceshooter') {
            if (this.timer >= 100) {
                this.timer = 0;
                const hasZombie = game.zombies.some(z =>
                    z.y === this.y && z.x > this.x
                );
                if (hasZombie) {
                    game.spawnProjectile(this.x + 40, this.y + 20, 'ice');
                }
            }
        }

        if (this.type === 'doubleshooter') {
            if (this.timer >= 100) {
                this.timer = 0;
                const hasZombie = game.zombies.some(z =>
                    z.y === this.y && z.x > this.x
                );
                if (hasZombie) {
                    game.spawnProjectile(this.x + 40, this.y + 15);
                    game.spawnProjectile(this.x + 40, this.y + 35);
                }
            }
        }

        if (this.type === 'cherry') {
            // Cherry bomb: explode immediately on placement
            game.cherryBomb(this.x, this.y);
            // Find grid position and clear it
            const row = Math.floor(this.y / 100);
            const col = Math.floor(this.x / 80);
            if (game.grid[row] && game.grid[row][col] === this) {
                game.grid[row][col] = null;
            }
            this.remove();
            return;
        }

        if (this.type === 'potato') {
            if (!this.armed) {
                this.armTimer += game.deltaTime;
                if (this.armTimer >= 3000) {
                    this.armed = true;
                    if (this.element) {
                        this.element.querySelector('.plant-inner').textContent = '💣';
                    }
                }
            } else {
                // Check if a zombie is on this cell
                const myRow = Math.floor(this.y / 100);
                const myCol = Math.floor(this.x / 80);
                for (const zombie of game.zombies) {
                    const zCol = Math.floor((zombie.x + 40) / 80);
                    const zRow = Math.floor(zombie.y / 100);
                    if (zRow === myRow && zCol === myCol) {
                        zombie.health = 0;
                        zombie.remove();
                        if (game.grid[myRow] && game.grid[myRow][myCol] === this) {
                            game.grid[myRow][myCol] = null;
                        }
                        this.remove();
                        return;
                    }
                }
            }
        }

        if (this.type === 'gatling') {
            if (this.timer >= 30) {
                this.timer = 0;
                const hasZombie = game.zombies.some(z => z.x > this.x);
                if (hasZombie) {
                    // 4 bullets with random vertical spread across 3 rows
                    for (let i = 0; i < 4; i++) {
                        const spread = (Math.random() - 0.5) * 200;
                        const py = this.y + 20 + spread;
                        if (py >= 0 && py < 500) {
                            game.spawnProjectile(this.x + 40, py, 'gatling');
                        }
                    }
                }
            }
        }

        if (this.type === 'sunflower') {
            if (this.timer >= 10) {
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
