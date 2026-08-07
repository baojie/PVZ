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

// 同时存活的子弹上限。每颗子弹是一个 DOM 元素，上千个一起动的时候浏览器
// 光合成就来不及，帧率掉下去 → 子弹每帧只走固定像素、于是活得更久 → 攒得更多，
// 越卡越多。封顶就是把这个正反馈掐断。
// 正常玩法离这个数很远，只有满屏叠种 + 超级机枪散射连喷才顶得到。
const MAX_PROJECTILES = 700;

// 达到上限时返回 null —— 取返回值的调用方（超级机枪散射要设 vy）需要判空。
export function spawnProjectile(game, x, y, type = 'normal') {
    if (game.projectiles.length >= MAX_PROJECTILES) return null;
    const proj = new Projectile(x, y, type);
    game.projectiles.push(proj);
    return proj;
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

