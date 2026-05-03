// 植物行为表：声明式描述每种植物每个 tick 该做什么。
//
// 简单射手用 { interval, kind, shots } 表达；非常规行为（樱桃 / 土豆 / 坚果保龄球
// 等带状态或一次性的）用 tick / fire 函数。
//
// shots 元素为 [projectileType, dy]，dy 是相对植物 y 的纵向偏移。
// kind:
//   row         —— 同行有敌人（或大招中）则按 shots 发射
//   tri         —— 上中下三行各检查一次（敌人含 wanderer，大招中视作有敌）
//   tri-zombies —— 同 tri，但只看 game.zombies、不响应 ultimate（黑曜石历史行为）

function fireRow(plant, game, shots) {
    const r = Math.floor(plant.y / game.cellHeight);
    if (!(plant.ultimateMs > 0) && !game.hasEnemyInRow(r, plant.x)) return;
    for (const [proj, dy] of shots) {
        game.spawnProjectile(plant.x + 40, plant.y + dy, proj);
    }
}

function fireTri(plant, game, shots) {
    const dy0 = game.cellHeight;
    const maxY = game.height * game.cellHeight;
    const rows = [plant.y - dy0, plant.y, plant.y + dy0];
    for (const rowY of rows) {
        if (rowY < 0 || rowY >= maxY) continue;
        const r = Math.floor(rowY / game.cellHeight);
        if (!(plant.ultimateMs > 0) && !game.hasEnemyInRow(r, plant.x)) continue;
        for (const [proj, dy] of shots) {
            game.spawnProjectile(plant.x + 40, rowY + dy, proj);
        }
    }
}

function fireTriZombies(plant, game, shots) {
    const dy0 = game.cellHeight;
    const maxY = game.height * game.cellHeight;
    const rows = [plant.y - dy0, plant.y, plant.y + dy0];
    for (const rowY of rows) {
        if (rowY < 0 || rowY >= maxY) continue;
        const target = Math.floor(rowY / game.cellHeight);
        const has = game.zombies.some(z =>
            Math.floor(z.y / game.cellHeight) === target && z.x > plant.x
        );
        if (!has) continue;
        for (const [proj, dy] of shots) {
            game.spawnProjectile(plant.x + 40, rowY + dy, proj);
        }
    }
}

function gatlingBurst(plant, game) {
    if (!(plant.ultimateMs > 0) && !game.hasAnyEnemy(plant.x)) return;
    const maxY = game.height * game.cellHeight;
    for (let i = 0; i < 4; i++) {
        const py = plant.y + 20 + (Math.random() - 0.5) * 200;
        if (py >= 0 && py < maxY) game.spawnProjectile(plant.x + 40, py, 'gatling');
    }
}

function sunflowerProduce(plant, game) {
    game.spawnSun(plant.x, plant.y, 25);
}

function corncannonAuto(plant, game) {
    game.cannonAutoFire(plant.x, plant.y);
}

function cherryTick(plant, game) {
    if (plant.ultimateMs > 0 && !plant._cherryUlt) {
        plant._cherryUlt = true;
        const types = ['peashooter', 'sunflower', 'wallnut', 'iceshooter', 'doubleshooter',
                       'pitcher', 'glue', 'obsidian', 'gatling', 'waterdrop', 'corncannon',
                       'primitivepea', 'triplepea'];
        for (let r = 0; r < game.height; r++) {
            for (let c = 0; c < game.width; c++) {
                game.spawnPlant(r, c, types[Math.floor(Math.random() * types.length)]);
            }
        }
        plant.remove();
        return;
    }
    if (plant.timer >= 800) {
        game.cherryBomb(plant.x, plant.y);
        plant.remove();
    }
}

function potatoTick(plant, game) {
    if (plant.ultimateMs > 0 && !plant._potatoUlt) {
        plant._potatoUlt = true;
        for (let r = 0; r < game.height; r++) {
            for (let c = 0; c < game.width; c++) game.spawnPlant(r, c, 'cherry');
        }
        plant.remove();
        return;
    }
    if (!plant.armed) {
        plant.armTimer += game.deltaTime;
        if (plant.armTimer >= 3000) {
            plant.armed = true;
            if (plant.element) plant.element.querySelector('.plant-inner').textContent = '💣';
        }
        return;
    }
    const myRow = Math.floor(plant.y / game.cellHeight);
    const myCol = Math.floor(plant.x / game.cellWidth);
    for (const z of game.zombies) {
        const zCol = Math.floor((z.x + 40) / game.cellWidth);
        const zRow = Math.floor(z.y / game.cellHeight);
        if (zRow === myRow && zCol === myCol) {
            z.health = 0;
            z.remove();
            plant.remove();
            return;
        }
    }
}

function nutbowlingTick(plant, game) {
    if (plant.timer < 2000) return;
    const wasUlt = plant.ultimateMs > 0;
    game.spawnProjectile(plant.x + 40, plant.y + 22, 'bowling');
    if (wasUlt) {
        const last = game.projectiles[game.projectiles.length - 1];
        if (last) last.ultimate = true;
    }
    plant.remove();
}

export const PLANT_BEHAVIORS = {
    peashooter:    { interval: 100,  kind: 'row',         shots: [['normal', 20]] },
    pitcher:       { interval: 1500, kind: 'row',         shots: [['piercing', 20]] },
    glue:          { interval: 500,  kind: 'row',         shots: [['glue', 20]] },
    iceshooter:    { interval: 100,  kind: 'row',         shots: [['ice', 20]] },
    doubleshooter: { interval: 100,  kind: 'row',         shots: [['normal', 15], ['normal', 35]] },
    waterdrop:     { interval: 1000, kind: 'row',         shots: [['waterdrop', 20]] },
    primitivepea:  { interval: 100,  kind: 'row',         shots: [['primitivepea', 20]] },
    triplepea:     { interval: 100,  kind: 'tri',         shots: [['normal', 20]] },
    obsidian:      { interval: 300,  kind: 'tri-zombies', shots: [['obsidian', 20]] },

    gatling:       { interval: 30, fire: gatlingBurst },
    sunflower:     { interval: 10, fire: sunflowerProduce },
    corncannon:    { interval: 5,  fire: corncannonAuto },

    cherry:        { tick: cherryTick },
    potato:        { tick: potatoTick },
    nutbowling:    { tick: nutbowlingTick },
};

export function runPlantBehavior(plant, game) {
    const b = PLANT_BEHAVIORS[plant.type];
    if (!b) return;
    if (b.tick) { b.tick(plant, game); return; }
    if (plant.timer < b.interval) return;
    plant.timer = 0;
    if (b.fire) { b.fire(plant, game); return; }
    if (b.kind === 'row')         fireRow(plant, game, b.shots);
    else if (b.kind === 'tri')    fireTri(plant, game, b.shots);
    else if (b.kind === 'tri-zombies') fireTriZombies(plant, game, b.shots);
}
