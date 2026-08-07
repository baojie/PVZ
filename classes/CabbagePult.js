// 卷心菜投手的绿叶素大招：对场上每一个僵尸各抛出一颗巨大的卷心菜。
//
// 卷心菜走抛物线从高空飞过去，越过一路上的所有障碍物（坚果墙、其他僵尸、
// 路障 / 铁桶 / 铁门 / 报纸护甲），直接砸在目标头上 —— 落点伤害不走
// Zombie.takeDamage 的护盾判定，所以任何护甲都挡不住这「无数点」伤害。

const LOB_MS = 700;        // 单颗卷心菜的飞行时间
const ARC_HEIGHT = 180;    // 抛物线弧顶高度（px）
const STAGGER_MS = 40;     // 每颗之间的错开，打出连发感
const MAX_STAGGER = 400;

export function cabbageBarrage(game, plant) {
    const targets = [];
    for (const z of game.zombies) {
        if (!z.markedForDeletion) targets.push({ zombie: z });
    }
    const ws = game.wandererSystem;
    if (ws) {
        for (let i = 0; i < ws.count; i++) targets.push({ wandererIdx: i });
    }

    if (targets.length === 0) {
        flash(game, '🥬 场上没有僵尸!');
        return;
    }

    game.sound.playExplosion();
    targets.forEach((t, i) => lobCabbage(game, plant, t, Math.min(i * STAGGER_MS, MAX_STAGGER)));
    flash(game, `🥬 ${targets.length} 颗卷心菜齐发 — 无数点伤害!`);
}

// 目标当前位置（僵尸会一直走，飞行途中要跟着更新）。目标没了返回 null。
function targetCenter(game, t) {
    if (t.zombie) {
        const z = t.zombie;
        if (z.markedForDeletion) return null;
        return { x: z.x + z.width / 2, y: z.y + z.height / 2 };
    }
    const ws = game.wandererSystem;
    if (!ws || t.wandererIdx >= ws.count) return null;
    return { x: ws.px[t.wandererIdx] + 20, y: ws.py[t.wandererIdx] + 30 };
}

function lobCabbage(game, plant, t, delay) {
    const el = document.createElement('div');
    el.className = 'lob-cabbage';
    el.textContent = '🥬';
    el.style.left = `${plant.x + 20}px`;
    el.style.top = `${plant.y + 10}px`;
    game.board.appendChild(el);

    const sx = plant.x + 20;
    const sy = plant.y + 10;
    const startAt = performance.now() + delay;

    const step = (now) => {
        const p = (now - startAt) / LOB_MS;
        if (p < 0) { requestAnimationFrame(step); return; }

        const c = targetCenter(game, t);
        if (!c) { el.remove(); return; }

        if (p >= 1) {
            el.remove();
            smash(game, t, c);
            return;
        }

        el.style.left = `${sx + (c.x - sx) * p}px`;
        el.style.top = `${sy + (c.y - sy) * p - Math.sin(Math.PI * p) * ARC_HEIGHT}px`;
        el.style.transform = `rotate(${p * 540}deg)`;
        requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function smash(game, t, c) {
    if (t.zombie) {
        const z = t.zombie;
        if (z.markedForDeletion) return;
        // 直接清血，绕过 takeDamage 的报纸 / 铁门护盾判定
        z.health = 0;
        z.remove();
        if (game.sound) game.sound.playZombieDie();
    } else {
        const ws = game.wandererSystem;
        if (!ws || t.wandererIdx >= ws.count) return;
        ws.hp[t.wandererIdx] = ws.maxHp;
        ws.vx[t.wandererIdx] = 0.8 + Math.random() * 0.8;
        ws.px[t.wandererIdx] = ws.W;
    }

    const splash = document.createElement('div');
    splash.className = 'cabbage-splash';
    splash.style.left = `${c.x - 40}px`;
    splash.style.top = `${c.y - 40}px`;
    game.board.appendChild(splash);
    setTimeout(() => splash.remove(), 450);
}

function flash(game, text) {
    const el = document.createElement('div');
    el.className = 'flash-message';
    el.style.background = 'rgba(60, 180, 60, 0.9)';
    el.textContent = text;
    document.getElementById('game-container').appendChild(el);
    setTimeout(() => el.remove(), 1500);
}
