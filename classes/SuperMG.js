// 超级机枪 🪖 —— 戴钢盔的豌豆。
//
// 常规：每 0.5 秒泼出 6 颗豌豆，每颗 20 点伤害。
// 大招：每打满 5 轮（约 2.5 秒）自动触发一次，向前扇形喷出 150 颗散射豌豆，
//       每颗同样 20 伤，纵向速度从 -SPREAD 均匀铺到 +SPREAD，扫掉整个屏幕。
// 这个大招是自动的，和绿叶素无关；吃了绿叶素只是 timer ×20，轮次来得更快。

import { spawnProjectile } from './CombatManager.js';

const PEAS_PER_VOLLEY = 6;
const SCATTER_COUNT = 150;
const SCATTER_SPREAD = 3.2;   // 散射豌豆的最大纵向速度（px/帧）

export function mgVolley(game, plant) {
    const x0 = plant.x + 40;
    const y0 = plant.y + 20;
    for (let i = 0; i < PEAS_PER_VOLLEY; i++) {
        // x 上错开成一条弹链、y 上小幅交错，看起来像一梭子连发
        spawnProjectile(game, x0 + i * 13, y0 + (i % 2 ? 6 : -6), 'mgpea');
    }
    game.sound.playShoot();
}

export function mgScatter(game, plant) {
    const x0 = plant.x + 40;
    const y0 = plant.y + 20;

    for (let i = 0; i < SCATTER_COUNT; i++) {
        // t 从 -1 均匀铺到 +1，得到一个正对前方的扇面
        const t = (i / (SCATTER_COUNT - 1)) * 2 - 1;
        const p = spawnProjectile(game, x0 + (i % 10) * 4, y0, 'scatterpea');
        p.vy = t * SCATTER_SPREAD;
    }

    game.sound.playExplosion();
    muzzle(game, plant);
    if (plant.element) {
        plant.element.classList.remove('mg-recoil');
        void plant.element.offsetWidth;
        plant.element.classList.add('mg-recoil');
        setTimeout(() => plant.element?.classList.remove('mg-recoil'), 400);
    }
}

function muzzle(game, plant) {
    const el = document.createElement('div');
    el.className = 'mg-muzzle';
    el.style.left = `${plant.x + 52}px`;
    el.style.top = `${plant.y + 24}px`;
    game.board.appendChild(el);
    setTimeout(() => el.remove(), 320);
}
