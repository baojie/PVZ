// 阳光帝果 👑🌰 —— 黄色的坚果，头上再顶一颗小一号的坚果，两颗的左右都长着
// 向日葵的花瓣。血量无限，杵在那儿谁也啃不动。
//
// 点它一下（要求场上阳光 ≥ 500）：
//   · 自己回满血（本来就是无限血，这一下是给个回血的动静）
//   · 面前攒出一颗坚果保龄球，3 秒后自己顺着这一行滚出去，碾碎沿途所有僵尸
//
// 关键：场上同时只攒一颗球。在它滚出去之前继续点，是把这一颗越点越大，
// 而不是再排一颗；球的大小记在植物身上，只增不减 —— 滚出去之后再点，
// 下一颗从当前尺寸接着往上长，绝不会缩回去。
//
// 阳光只做门槛，不扣 —— 这作里所有植物都是 0 阳光。

import { spawnProjectile } from './CombatManager.js';

const SUN_REQUIRED = 500;      // 场上阳光够这个数才点得动
const ROLL_DELAY = 3000;       // 攒球到滚出去的时间
const BALL_STEP = 0.35;        // 每点一次，球大一圈
const BALL_BASE = 56;          // 保龄球本来的直径（px）

export function ballScale(plant) {
    return plant._seBall || 1;
}

function ballSize(plant) {
    return BALL_BASE * ballScale(plant);
}

// 点了一下阳光帝果。不是这株就返回 false，让点击继续往下走。
export function sunEmperorClick(game, row, col) {
    const stack = game.grid[row] && game.grid[row][col];
    if (!stack || stack.length === 0) return false;
    const top = stack[stack.length - 1];
    if (top.type !== 'sunemperor' || top.markedForDeletion) return false;

    if (!(game.suns >= SUN_REQUIRED)) {
        game.showNotEnoughFeedback(`👑 阳光不够 ${SUN_REQUIRED}`);
        return true;
    }

    // 回血 + 一圈金色的回血光
    top.health = top.maxHealth;
    if (top.element) {
        top.element.classList.remove('se-heal');
        void top.element.offsetWidth;
        top.element.classList.add('se-heal');
        setTimeout(() => top.element?.classList.remove('se-heal'), 700);
    }

    // 球只增不减
    top._seBall = ballScale(top) + BALL_STEP;

    // 已经在攒了就只把它撑大，倒计时照旧走，不再多攒一颗
    if (!top._sePending) {
        top._sePending = { left: ROLL_DELAY, el: heldBall(game, top) };
    }
    sizeHeld(top);

    game.sound.playPlant();
    game.showNotEnoughFeedback(`👑 保龄球 ×${top._seBall.toFixed(2)}（${Math.round(ballSize(top))}px）`);
    return true;
}

// 每帧推进倒计时，到点把攒着的那颗放出去
export function sunEmperorTick(plant, game) {
    const pending = plant._sePending;
    if (!pending) return;

    pending.left -= game.deltaTime || 16;
    if (pending.left > 0) return;

    pending.el?.remove();
    plant._sePending = null;
    rollBall(game, plant);
}

// 攒球期间摆在植物面前的那颗，点一下大一圈
function heldBall(game, plant) {
    const el = document.createElement('div');
    el.className = 'se-held-ball';
    game.board.appendChild(el);
    return el;
}

function sizeHeld(plant) {
    const p = plant._sePending;
    if (!p || !p.el) return;
    const size = ballSize(plant);
    p.el.style.width = `${size}px`;
    p.el.style.height = `${size}px`;
    p.el.style.left = `${plant.x + 40 - size / 2}px`;
    p.el.style.top = `${plant.y + 50 - size / 2}px`;
}

// 放出去：滚出去的这颗就是刚才攒到的那么大，一路滚出屏幕都不会缩
function rollBall(game, plant) {
    const size = ballSize(plant);
    const ball = spawnProjectile(game, plant.x + 40, plant.y + 50 - size / 2, 'bowling', plant);
    if (!ball) return;   // 撞到子弹上限了

    // 撑大碰撞盒和 DOM，越点越大的那颗就是这么来的
    ball.width = size;
    ball.height = size;
    if (ball.element) {
        ball.element.style.width = `${size}px`;
        ball.element.style.height = `${size}px`;
    }
    game.sound.playExplosion();
}
