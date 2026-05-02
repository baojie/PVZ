import { Zombie } from './Zombie.js';

export function generateWaves(zombieCountMultiplier = 1, waveCountSetting = 6) {
    const m = zombieCountMultiplier;
    const sc = (v) => Math.max(1, Math.round(v * m));
    const allWaves = [
        { zombies: [{ type: 'normal', count: sc(500) }], interval: 50 },
        { zombies: [{ type: 'normal', count: sc(800) }, { type: 'newspaper', count: sc(300) }], interval: 45 },
        { zombies: [{ type: 'normal', count: sc(800) }, { type: 'cone', count: sc(500) }, { type: 'polevault', count: sc(200) }], interval: 40 },
        { zombies: [{ type: 'normal', count: sc(800) }, { type: 'cone', count: sc(800) }, { type: 'newspaper', count: sc(400) }], interval: 38 },
        { zombies: [{ type: 'normal', count: sc(600) }, { type: 'cone', count: sc(800) }, { type: 'bucket', count: sc(400) }, { type: 'polevault', count: sc(300) }], interval: 33 },
        { zombies: [{ type: 'normal', count: sc(1000) }, { type: 'cone', count: sc(1000) }, { type: 'bucket', count: sc(1000) }, { type: 'door', count: sc(300) }], interval: 25 },
        { zombies: [{ type: 'normal', count: sc(1200) }, { type: 'cone', count: sc(1200) }, { type: 'bucket', count: sc(600) }, { type: 'newspaper', count: sc(500) }, { type: 'door', count: sc(400) }], interval: 22 },
        { zombies: [{ type: 'normal', count: sc(800) }, { type: 'cone', count: sc(1500) }, { type: 'bucket', count: sc(1200) }, { type: 'polevault', count: sc(600) }, { type: 'door', count: sc(600) }], interval: 20 },
        { zombies: [{ type: 'normal', count: sc(2000) }, { type: 'cone', count: sc(2000) }, { type: 'bucket', count: sc(2000) }, { type: 'newspaper', count: sc(1000) }, { type: 'polevault', count: sc(800) }, { type: 'door', count: sc(800) }], interval: 18 },
    ];
    return allWaves.slice(0, waveCountSetting);
}

export function getTotalZombiesInWave(wave) {
    return wave.zombies.reduce((sum, g) => sum + g.count, 0);
}

export function spawnZombie(game, row, type = 'normal') {
    const y = row * game.cellHeight;
    const zombie = new Zombie(game.boardWidth, y, type, game.zombieSpeedMultiplier);
    game.zombies.push(zombie);
}

export function updateWaves(game, deltaTime) {
    if (game.waveIndex >= game.waves.length) return;

    game.waveTimer -= deltaTime;
    if (game.waveTimer > 0) return;

    const wave = game.waves[game.waveIndex];
    const totalZombies = getTotalZombiesInWave(wave);

    game.waveSpawnTimer -= deltaTime;
    if (game.waveSpawnTimer <= 0 && game.zombiesSpawnedInWave < totalZombies) {
        const pool = [];
        for (const group of wave.zombies) {
            for (let i = 0; i < group.count; i++) pool.push(group.type);
        }
        const type = pool[game.zombiesSpawnedInWave] || 'normal';
        const row = Math.floor(Math.random() * game.height);
        spawnZombie(game, row, type);
        game.zombiesSpawnedInWave++;
        game.waveSpawnTimer = wave.interval;
    }

    if (game.zombiesSpawnedInWave >= totalZombies && game.zombies.length === 0) {
        game.waveIndex++;
        game.zombiesSpawnedInWave = 0;
        game.waveTimer = 80;
        game.updateProgressBar();
    }
}
