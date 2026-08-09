// 西瓜投手 🍉 —— 把西瓜高高抛出去，越过一路上的所有障碍物（坚果墙、其他僵尸、
// 路障 / 铁桶 / 铁门 / 报纸护甲），直接砸在目标头上。
//
// 普通：每 1.2 秒朝同行最靠前的那只僵尸抛一颗西瓜，落地 100 点伤害。
// 绿叶素大招：整株变成一台**西瓜狙击炮**，场上有几只僵尸就打几发巨型西瓜，
//             一发 700 点。
// 红叶素大招：改打巨型红樱桃，场上几只僵尸就几颗，落地一万点伤害。
//
// 落点伤害直接扣血，不走 Zombie.takeDamage 的护盾判定 —— 从天上砸下来的东西，
// 报纸和铁门挡不住。

const LOB_MS = 700;         // 单颗的飞行时间
const ARC_HEIGHT = 190;     // 抛物线弧顶高度（px）
const STAGGER_MS = 45;      // 齐射时每颗之间的错开
const MAX_STAGGER = 500;

export const MELON_INTERVAL = 1200;   // 普通攻击间隔
export const MELON_DAMAGE = 100;      // 普通西瓜
export const SNIPER_DAMAGE = 700;     // 大招的巨型西瓜
export const CHERRY_DAMAGE = 10000;   // 红叶素的巨型红樱桃

// ---------- 普通攻击 ----------

// 同行最靠前（最靠左但还在植物右边）的那只僵尸
function frontTarget(game, plant) {
    const row = Math.floor(plant.y / game.cellHeight);
    let best = null;
    for (const z of game.zombies) {
        if (z.markedForDeletion) continue;
        if (Math.floor(z.y / game.cellHeight) !== row) continue;
        if (z.x <= plant.x) continue;
        if (!best || z.x < best.x) best = z;
    }
    return best;
}

export function melonLob(game, plant) {
    const z = frontTarget(game, plant);
    if (!z) return;
    lob(game, plant, { zombie: z }, 0, { emoji: '🍉', size: 30, damage: MELON_DAMAGE, cls: 'lob-melon' });
    game.sound.playShoot();
}

// ---------- 绿叶素：西瓜狙击炮 ----------

export function melonSniper(game, plant) {
    const targets = collect(game);
    if (targets.length === 0) {
        flash(game, '🍉 场上没有僵尸!', 'rgba(60, 160, 60, 0.92)');
        return;
    }
    plant.element?.classList.add('melon-cannon');
    setTimeout(() => plant.element?.classList.remove('melon-cannon'), 2200);

    targets.forEach((t, i) => lob(game, plant, t, Math.min(i * STAGGER_MS, MAX_STAGGER),
        { emoji: '🍉', size: 74, damage: SNIPER_DAMAGE, cls: 'lob-melon big' }));

    game.sound.playExplosion();
    flash(game, `🍉 西瓜狙击炮! ${targets.length} 发巨型西瓜 × ${SNIPER_DAMAGE}`, 'rgba(60, 160, 60, 0.92)');
}

// ---------- 红叶素：巨型红樱桃齐射 ----------

export function melonCherryVolley(game, plant) {
    const targets = collect(game);
    if (targets.length === 0) {
        flash(game, '❤️ 场上没有僵尸!', 'rgba(200, 40, 60, 0.92)');
        return;
    }
    plant.element?.classList.add('melon-cannon');
    setTimeout(() => plant.element?.classList.remove('melon-cannon'), 2200);

    targets.forEach((t, i) => lob(game, plant, t, Math.min(i * STAGGER_MS, MAX_STAGGER),
        { emoji: '🍒', size: 74, damage: CHERRY_DAMAGE, cls: 'lob-melon big cherry' }));

    game.sound.playExplosion();
    flash(game, `❤️ ${targets.length} 颗巨型红樱桃 × ${CHERRY_DAMAGE}!`, 'rgba(200, 40, 60, 0.92)');
}

// ---------- 公共部分 ----------

// 场上所有能打的目标：僵尸 + 游荡者
function collect(game) {
    const targets = [];
    for (const z of game.zombies) {
        if (!z.markedForDeletion) targets.push({ zombie: z });
    }
    const ws = game.wandererSystem;
    if (ws) {
        for (let i = 0; i < ws.count; i++) targets.push({ wandererIdx: i });
    }
    return targets;
}

// 目标当前位置（僵尸一直在走，飞行途中要跟着更新）。目标没了返回 null。
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

function lob(game, plant, t, delay, cfg) {
    const el = document.createElement('div');
    el.className = cfg.cls;
    el.textContent = cfg.emoji;
    el.style.fontSize = `${cfg.size}px`;
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
            smash(game, t, c, cfg);
            return;
        }

        el.style.left = `${sx + (c.x - sx) * p}px`;
        el.style.top = `${sy + (c.y - sy) * p - Math.sin(Math.PI * p) * ARC_HEIGHT}px`;
        el.style.transform = `rotate(${p * 420}deg)`;
        requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function smash(game, t, c, cfg) {
    if (t.zombie) {
        const z = t.zombie;
        if (z.markedForDeletion) return;
        // 直接扣血，绕过报纸 / 铁门那套护盾判定
        z.health -= cfg.damage;
        if (z.health <= 0) {
            z.remove();
            game.sound?.playZombieDie();
        } else {
            z.draw();
        }
    } else {
        const ws = game.wandererSystem;
        if (!ws || t.wandererIdx >= ws.count) return;
        // 游荡者打不死，轰回右边重新爬
        ws.hp[t.wandererIdx] = ws.maxHp;
        ws.vx[t.wandererIdx] = 0.8 + Math.random() * 0.8;
        ws.px[t.wandererIdx] = ws.W;
    }

    const splash = document.createElement('div');
    splash.className = cfg.cls.includes('cherry') ? 'melon-splash cherry' : 'melon-splash';
    const r = cfg.size >= 60 ? 60 : 34;
    splash.style.left = `${c.x - r}px`;
    splash.style.top = `${c.y - r}px`;
    splash.style.width = `${r * 2}px`;
    splash.style.height = `${r * 2}px`;
    game.board.appendChild(splash);
    setTimeout(() => splash.remove(), 450);
}

function flash(game, text, bg) {
    const el = document.createElement('div');
    el.className = 'flash-message';
    el.style.background = bg;
    el.textContent = text;
    document.getElementById('game-container').appendChild(el);
    setTimeout(() => el.remove(), 1500);
}
