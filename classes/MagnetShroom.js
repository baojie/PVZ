// 磁力菇：持续把场上所有僵尸（含游荡者）吸到自己所在的这一行，
// 把整片草坪的进攻压缩成一条线，交给这一行的输出植物收割。
//
// 绿叶素大招：先把所有僵尸瞬间吸成一条直线，再引爆磁场 ——
// 金属护甲（路障 / 铁桶 / 铁门 / 报纸）先被磁力扒掉，然后每个僵尸
// 吃满 17000 点伤害，正好是本作僵尸的满血值。

const PULL_PER_MS = 0.25;   // 普通吸附速度（px/ms），约 0.4 秒吸过一行
const SNAP_PX = 4;          // 差距小于这个值直接吸附到位
const WANDER_PULL = 0.12;   // 游荡者每帧向目标行收拢的比例
const ULT_GATHER_MS = 500;  // 大招吸成一线的蓄力时间
const ULT_DAMAGE = 17000;

// 磁力菇所在行的顶边 y
function magnetRowY(game, plant) {
    return Math.floor(plant.y / game.cellHeight) * game.cellHeight;
}

// 游荡者按 (py + 30) 判定所在行，py 落在行首 +20 时正好居中
function wandererTargetY(rowY) {
    return rowY + 20;
}

// ---------- 普通形态：持续吸附 ----------

export function magnetPull(game, plant) {
    const rowY = magnetRowY(game, plant);
    const step = (game.deltaTime || 16) * PULL_PER_MS;

    for (const z of game.zombies) {
        if (z.markedForDeletion) continue;
        const dy = rowY - z.y;
        if (Math.abs(dy) <= SNAP_PX) {
            // 精确对齐行首：割草机判定用的是 z.y === row * cellHeight
            if (z.y !== rowY) { z.y = rowY; z.draw(); }
            z.element?.classList.remove('magnetized');
            continue;
        }
        z.y += Math.sign(dy) * Math.min(step, Math.abs(dy));
        z.draw();
        z.element?.classList.add('magnetized');
    }

    const ws = game.wandererSystem;
    if (!ws) return;
    const target = wandererTargetY(rowY);
    for (let i = 0; i < ws.count; i++) {
        // 阻尼掉纵向弹跳再往目标行收拢。磁力菇没了以后，
        // WandererSystem 的随机换向计时会在几秒内把 vy 重新甩起来。
        ws.vy[i] *= 0.8;
        ws.py[i] += (target - ws.py[i]) * WANDER_PULL;
    }
}

// ---------- 绿叶素大招：吸成一线 → 引爆 ----------

export function magnetUltimate(game, plant) {
    const rowY = magnetRowY(game, plant);
    const targets = game.zombies.filter(z => !z.markedForDeletion);
    const ws = game.wandererSystem;
    const wCount = ws ? ws.count : 0;

    if (targets.length === 0 && wCount === 0) {
        flash(game, '🧲 场上没有僵尸!');
        return;
    }

    game.sound.playIceShoot();

    const field = document.createElement('div');
    field.className = 'magnet-field';
    field.style.top = `${rowY}px`;
    game.board.appendChild(field);

    const startAt = performance.now();
    const fromY = targets.map(z => z.y);
    const wFromY = [];
    for (let i = 0; i < wCount; i++) wFromY.push(ws.py[i]);
    const wTarget = wandererTargetY(rowY);

    const step = (now) => {
        const p = Math.min(1, (now - startAt) / ULT_GATHER_MS);

        targets.forEach((z, i) => {
            if (z.markedForDeletion) return;
            z.y = fromY[i] + (rowY - fromY[i]) * p;
            z.draw();
            z.element?.classList.add('magnetized');
        });
        for (let i = 0; i < wCount; i++) {
            ws.vy[i] = 0;
            ws.py[i] = wFromY[i] + (wTarget - wFromY[i]) * p;
        }

        if (p < 1) { requestAnimationFrame(step); return; }
        field.remove();
        detonate(game, rowY, targets);
    };
    requestAnimationFrame(step);
}

function detonate(game, rowY, targets) {
    game.sound.playExplosion();

    const band = document.createElement('div');
    band.className = 'magnet-blast-band';
    band.style.top = `${rowY}px`;
    game.board.appendChild(band);
    setTimeout(() => band.remove(), 600);

    let hits = 0;

    for (const z of targets) {
        if (z.markedForDeletion) continue;
        stripMetal(z);
        z.takeDamage(ULT_DAMAGE);
        blastAt(game, z.x + z.width / 2, rowY + 50);
        if (z.health <= 0) {
            z.remove();
            game.sound.playZombieDie();
        } else {
            z.element?.classList.remove('magnetized');
        }
        hits++;
    }

    const ws = game.wandererSystem;
    if (ws) {
        for (let i = 0; i < ws.count; i++) {
            blastAt(game, ws.px[i] + 20, rowY + 50);
            // 游荡者血量是 Infinity，炸不死，直接把它轰回右侧重新爬
            ws.px[i] = ws.W;
            ws.vy[i] = Math.random() < 0.5 ? 2 : -2;
            hits++;
        }
    }

    flash(game, `🧲 ${hits} 只僵尸吃满 ${ULT_DAMAGE} 点伤害!`);
}

// 磁力先把金属护甲扒掉，护甲就挡不住后面的 17000 了
function stripMetal(z) {
    if (z.newspaperHealth > 0) z.newspaperHealth = 0;
    if (z.doorHealth > 0) z.doorHealth = 0;
}

function blastAt(game, x, y) {
    const el = document.createElement('div');
    el.className = 'magnet-blast';
    el.style.left = `${x - 45}px`;
    el.style.top = `${y - 45}px`;
    game.board.appendChild(el);
    setTimeout(() => el.remove(), 500);
}

function flash(game, text) {
    const el = document.createElement('div');
    el.className = 'flash-message';
    el.style.background = 'rgba(150, 60, 200, 0.9)';
    el.textContent = text;
    document.getElementById('game-container').appendChild(el);
    setTimeout(() => el.remove(), 1500);
}
