import { Entity } from './Entity.js';

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

        if (this.type === 'peashooter') {
            if (this.timer >= 100) {
                this.timer = 0;
                const hasZombie = (this.ultimateMs > 0) || game.hasEnemyInRow(Math.floor(this.y / 100), this.x);
                if (hasZombie) {
                    game.spawnProjectile(this.x + 40, this.y + 20);
                }
            }
        }

        if (this.type === 'pitcher') {
            if (this.timer >= 1500) {
                this.timer = 0;
                const hasZombie = (this.ultimateMs > 0) || game.hasEnemyInRow(Math.floor(this.y / 100), this.x);
                if (hasZombie) {
                    game.spawnProjectile(this.x + 40, this.y + 20, 'piercing');
                }
            }
        }

        if (this.type === 'glue') {
            if (this.timer >= 500) {
                this.timer = 0;
                const hasZombie = (this.ultimateMs > 0) || game.hasEnemyInRow(Math.floor(this.y / 100), this.x);
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
                        Math.floor(z.y / 100) === Math.floor(rowY / 100) && z.x > this.x
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
                const hasZombie = (this.ultimateMs > 0) || game.hasEnemyInRow(Math.floor(this.y / 100), this.x);
                if (hasZombie) {
                    game.spawnProjectile(this.x + 40, this.y + 20, 'ice');
                }
            }
        }

        if (this.type === 'doubleshooter') {
            if (this.timer >= 100) {
                this.timer = 0;
                const hasZombie = (this.ultimateMs > 0) || game.hasEnemyInRow(Math.floor(this.y / 100), this.x);
                if (hasZombie) {
                    game.spawnProjectile(this.x + 40, this.y + 15);
                    game.spawnProjectile(this.x + 40, this.y + 35);
                }
            }
        }

        if (this.type === 'cherry') {
            if (this.ultimateMs > 0 && !this._cherryUlt) {
                this._cherryUlt = true;
                const types = ['peashooter', 'sunflower', 'wallnut', 'iceshooter', 'doubleshooter', 'pitcher', 'glue', 'obsidian', 'gatling', 'waterdrop', 'corncannon', 'primitivepea', 'triplepea'];
                for (let r = 0; r < game.height; r++) {
                    for (let c = 0; c < game.width; c++) {
                        game.spawnPlant(r, c, types[Math.floor(Math.random() * types.length)]);
                    }
                }
                this.remove();
                return;
            }
            if (this.timer >= 800) {
                game.cherryBomb(this.x, this.y);
                this.remove();
                return;
            }
        }

        if (this.type === 'potato') {
            if (this.ultimateMs > 0 && !this._potatoUlt) {
                this._potatoUlt = true;
                for (let r = 0; r < game.height; r++) {
                    for (let c = 0; c < game.width; c++) {
                        game.spawnPlant(r, c, 'cherry');
                    }
                }
                this.remove();
                return;
            }
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
                        this.remove();
                        return;
                    }
                }
            }
        }

        if (this.type === 'gatling') {
            if (this.timer >= 30) {
                this.timer = 0;
                const hasZombie = (this.ultimateMs > 0) || game.hasAnyEnemy(this.x);
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

        if (this.type === 'waterdrop') {
            if (this.timer >= 1000) {
                this.timer = 0;
                const hasZombie = (this.ultimateMs > 0) || game.hasEnemyInRow(Math.floor(this.y / 100), this.x);
                if (hasZombie) {
                    game.spawnProjectile(this.x + 40, this.y + 20, 'waterdrop');
                }
            }
        }

        if (this.type === 'primitivepea') {
            if (this.timer >= 100) {
                this.timer = 0;
                const hasZombie = (this.ultimateMs > 0) || game.hasEnemyInRow(Math.floor(this.y / 100), this.x);
                if (hasZombie) {
                    game.spawnProjectile(this.x + 40, this.y + 20, 'primitivepea');
                }
            }
        }

        if (this.type === 'triplepea') {
            if (this.timer >= 100) {
                this.timer = 0;
                const rows = [this.y - 100, this.y, this.y + 100];
                for (const rowY of rows) {
                    if (rowY < 0 || rowY >= 500) continue;
                    const r = Math.floor(rowY / 100);
                    if ((this.ultimateMs > 0) || game.hasEnemyInRow(r, this.x)) {
                        game.spawnProjectile(this.x + 40, rowY + 20);
                    }
                }
            }
        }

        if (this.type === 'corncannon') {
            if (this.timer >= 5) {
                this.timer = 0;
                game.cannonAutoFire(this.x, this.y);
            }
        }

        if (this.type === 'nutbowling') {
            if (this.timer >= 2000) {
                const wasUlt = this.ultimateMs > 0;
                game.spawnProjectile(this.x + 40, this.y + 22, 'bowling');
                if (wasUlt) {
                    const last = game.projectiles[game.projectiles.length - 1];
                    if (last) last.ultimate = true;
                }
                this.remove();
                return;
            }
        }

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
