// 卷心菜投手的绿叶素大招：抛出一颗巨大的卷心菜，砸到场上后
// 对全屏所有僵尸（含游荡者）造成「无数点」伤害。

const GIANT_DMG = Infinity;
const FLIGHT_MS = 600;

export function giantCabbage(game, plant) {
    game.sound.playExplosion();

    const cabbage = document.createElement('div');
    cabbage.className = 'giant-cabbage';
    cabbage.textContent = '🥬';
    cabbage.style.left = `${plant.x + 10}px`;
    cabbage.style.top = `${plant.y}px`;
    game.board.appendChild(cabbage);

    // 飞向棋盘中央上方，落点覆盖全场
    const midX = game.boardWidth / 2;
    const midY = (game.height * game.cellHeight) / 2;
    requestAnimationFrame(() => {
        cabbage.style.left = `${midX - 150}px`;
        cabbage.style.top = `${midY - 150}px`;
        cabbage.style.transform = 'scale(3) rotate(720deg)';
    });

    setTimeout(() => {
        cabbage.remove();
        smashAll(game);
    }, FLIGHT_MS);
}

function smashAll(game) {
    game.sound.playExplosion();

    for (const z of game.zombies) {
        if (z.markedForDeletion) continue;
        z.takeDamage(GIANT_DMG);
        z.health = 0;
        z.remove();
    }

    const ws = game.wandererSystem;
    if (ws) {
        for (let i = 0; i < ws.count; i++) {
            ws.hp[i] -= GIANT_DMG;
            if (ws.hp[i] <= 0) {
                ws.hp[i] = ws.maxHp;
                ws.vx[i] = 0.8 + Math.random() * 0.8;
                ws.px[i] = ws.W;
            }
        }
    }

    const shock = document.createElement('div');
    shock.className = 'cabbage-shock';
    game.board.appendChild(shock);
    setTimeout(() => shock.remove(), 600);

    const el = document.createElement('div');
    el.className = 'flash-message';
    el.style.background = 'rgba(60, 180, 60, 0.9)';
    el.textContent = '🥬 无数点伤害!';
    document.getElementById('game-container').appendChild(el);
    setTimeout(() => el.remove(), 1500);
}
