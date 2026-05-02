import { Projectile } from './Projectile.js';

export function hasEnemyInRow(game, row, minX) {
    if (game.zombies.some(z => Math.floor(z.y / game.cellHeight) === row && z.x > minX)) return true;
    if (!game.wandererSystem) return false;
    const ws = game.wandererSystem;
    for (let i = 0; i < ws.count; i++) {
        if (Math.floor(ws.py[i] / game.cellHeight) === row && ws.px[i] > minX) return true;
    }
    return false;
}

export function hasAnyEnemy(game, minX) {
    if (game.zombies.some(z => z.x > minX)) return true;
    if (!game.wandererSystem) return false;
    const ws = game.wandererSystem;
    for (let i = 0; i < ws.count; i++) {
        if (ws.px[i] > minX) return true;
    }
    return false;
}

export function spawnProjectile(game, x, y, type = 'normal') {
    const proj = new Projectile(x, y, type);
    game.projectiles.push(proj);
}

export function cherryBomb(game, plantX, plantY) {
    const centerRow = Math.floor(plantY / game.cellHeight);
    const centerCol = Math.floor(plantX / game.cellWidth);
    for (const zombie of game.zombies) {
        const zRow = Math.floor(zombie.y / game.cellHeight);
        const zCol = Math.floor((zombie.x + 40) / game.cellWidth);
        if (Math.abs(zRow - centerRow) <= 1 && Math.abs(zCol - centerCol) <= 1) {
            zombie.health = 0;
            zombie.remove();
        }
    }
    game.sound.playExplosion();
    const el = document.createElement('div');
    el.className = 'flash-message';
    el.style.background = 'rgba(255, 100, 0, 0.9)';
    el.textContent = '💥 BOOM!';
    document.getElementById('game-container').appendChild(el);
    setTimeout(() => el.remove(), 1500);
}

export function fireCannon(game, plant, targetX, targetY, targetZombie, wandererIdx) {
    const INTERVAL = 5;
    const SHOW_EVERY = 20;
    let tick = 0;

    game.sound.playExplosion();

    const id = setInterval(() => {
        if (tick % SHOW_EVERY === 0) {
            const ox = (Math.random() - 0.5) * 10, oy = (Math.random() - 0.5) * 10;
            const ball = document.createElement('div');
            ball.style.cssText = `position:absolute;left:${plant.x+20}px;top:${plant.y+30}px;font-size:18px;z-index:25;pointer-events:none;transition:left 0.2s linear,top 0.2s linear;`;
            ball.textContent = '🌽';
            game.board.appendChild(ball);
            requestAnimationFrame(() => { ball.style.left = `${targetX-9+ox}px`; ball.style.top = `${targetY-9+oy}px`; });
            setTimeout(() => {
                ball.remove();
                const flash = document.createElement('div');
                flash.style.cssText = `position:absolute;left:${targetX-20+ox}px;top:${targetY-20+oy}px;width:40px;height:40px;border-radius:50%;background:rgba(255,220,0,0.8);z-index:24;pointer-events:none;`;
                game.board.appendChild(flash);
                setTimeout(() => flash.remove(), 150);
            }, 200);
        }

        cannonExplosion(game, targetZombie, wandererIdx);
        tick++;
    }, INTERVAL);

    game.cannonIntervals.push(id);
}

export function cannonExplosion(game, targetZombie, wandererIdx) {
    const DMG = 1800;
    if (targetZombie && !targetZombie.markedForDeletion) {
        targetZombie.takeDamage(DMG);
        if (targetZombie.health <= 0) targetZombie.remove();
    } else if (wandererIdx >= 0 && game.wandererSystem) {
        const ws = game.wandererSystem;
        ws.hp[wandererIdx] -= DMG;
        if (ws.hp[wandererIdx] <= 0) {
            ws.hp[wandererIdx] = ws.maxHp;
            ws.vx[wandererIdx] = 0.8 + Math.random() * 0.8;
            ws.px[wandererIdx] = ws.W;
        }
    }
}

export function cannonAutoFire(game, plantX, plantY) {
    const DMG = 1800;
    for (const z of game.zombies) {
        if (!z.markedForDeletion) {
            z.takeDamage(DMG);
            if (z.health <= 0) z.remove();
        }
    }
    const ws = game.wandererSystem;
    if (ws) {
        for (let i = 0; i < ws.count; i++) {
            ws.hp[i] -= DMG;
            if (ws.hp[i] <= 0) {
                ws.hp[i] = ws.maxHp;
                ws.vx[i] = 0.8 + Math.random() * 0.8;
                ws.px[i] = ws.W;
            }
        }
    }
}
