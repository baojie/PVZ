import { PLANT_EMOJI, setEmojiCursor } from './Constants.js';

export function setupEventListeners(game) {
    // Game mode buttons
    document.getElementById('start-btn').addEventListener('click', () => { game.fusionMode = false; game.wandererMode = false; game.start(); });
    document.getElementById('start-fusion-btn').addEventListener('click', () => { game.fusionMode = true; game.wandererMode = false; game.start(); });
    document.getElementById('start-wanderer-btn')?.addEventListener('click', () => { game.fusionMode = false; game.wandererMode = true; game.start(); });
    document.getElementById('restart-btn').addEventListener('click', () => game.restart());
    document.getElementById('play-again-btn').addEventListener('click', () => game.restart());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && document.getElementById('start-screen').classList.contains('hidden')) {
            e.preventDefault();
            game.togglePause();
        }
        if (e.code === 'KeyF' && game.isRunning) {
            game.plantSpeedMultiplier = (game.plantSpeedMultiplier || 1) * 3;
            game.showNotEnoughFeedback(`⚡ 植物加速 ×${game.plantSpeedMultiplier}`);
        }
        if (e.code === 'KeyG') {
            game.zombieSpeedBoost = (game.zombieSpeedBoost || 1) * 3;
            console.log('[G] zombieSpeedBoost =', game.zombieSpeedBoost, '| zombies:', game.zombies?.length, '| wanderers:', game.wandererSystem?.count);
            game.showNotEnoughFeedback(`💨 僵尸加速 ×${game.zombieSpeedBoost}`);
        }
        if (e.code === 'KeyH') {
            game.zombieSpeedBoost = (game.zombieSpeedBoost || 1) / 3;
            console.log('[H] zombieSpeedBoost =', game.zombieSpeedBoost);
            game.showNotEnoughFeedback(`🐢 僵尸减速 ×${game.zombieSpeedBoost.toFixed(3)}`);
        }
        if (e.code === 'Escape') {
            game.selectedPlant = null;
            game.cannonTarget = null;
            game.cannonIntervals.forEach(id => clearInterval(id));
            game.cannonIntervals = [];
            document.querySelectorAll('.seed-packet').forEach(p => p.classList.remove('selected'));
            setEmojiCursor(null);
        }
    });

    // Sound toggle
    const soundBtn = document.getElementById('sound-toggle');
    if (soundBtn) {
        soundBtn.addEventListener('click', () => {
            game.sound.toggleMute();
            soundBtn.textContent = game.sound.muted ? '🔇' : '🔊';
        });
    }

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
        });
    });

    // Option button groups
    document.querySelectorAll('.btn-group').forEach(group => {
        group.querySelectorAll('.opt-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                group.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    });

    // Zombie speed slider
    const speedSlider = document.getElementById('zombie-speed');
    const speedLabel = document.getElementById('speed-label');
    const speedNames = { '0.5': '很慢', '1': '正常', '1.5': '快', '2': '很快', '2.5': '极快', '3': '噩梦' };
    if (speedSlider) {
        speedSlider.addEventListener('input', () => {
            speedLabel.textContent = speedNames[speedSlider.value] || `×${speedSlider.value}`;
        });
    }

    // Board click handler
    game.board.addEventListener('click', (e) => {
        if (!game.isRunning && !game.paused) return;

        if (!game.paused && e.target.classList.contains('sun')) {
            game.collectSun(e.target);
            return;
        }

        const cell = e.target.closest('.grid-cell');
        let row, col;
        if (cell) {
            row = parseInt(cell.dataset.row);
            col = parseInt(cell.dataset.col);
        } else {
            const rect = game.board.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            col = Math.floor(x / game.cellWidth);
            row = Math.floor(y / game.cellHeight);
            if (row < 0 || row >= game.height || col < 0 || col >= game.width) return;
        }

        if (game.shovelMode) {
            game.removePlant(row, col);
            return;
        }

        // 加农炮瞄准模式：必须点中僵尸
        if (game.cannonTarget) {
            const rect = game.board.getBoundingClientRect();
            const tx = e.clientX - rect.left;
            const ty = e.clientY - rect.top;

            let hitX = null, hitY = null, hitZombie = null, hitWandererIdx = -1;
            for (const z of game.zombies) {
                if (tx >= z.x && tx <= z.x + z.width && ty >= z.y && ty <= z.y + z.height) {
                    hitX = z.x + z.width / 2;
                    hitY = z.y + z.height / 2;
                    hitZombie = z;
                    break;
                }
            }
            if (hitX === null && game.wandererSystem) {
                const ws = game.wandererSystem;
                for (let i = 0; i < ws.count; i++) {
                    if (tx >= ws.px[i] && tx <= ws.px[i] + 40 && ty >= ws.py[i] && ty <= ws.py[i] + 60) {
                        hitX = ws.px[i] + 20;
                        hitY = ws.py[i] + 30;
                        hitWandererIdx = i;
                        break;
                    }
                }
            }
            if (hitX === null) return;

            if (game.paused) {
                game.pendingCannon = { plant: game.cannonTarget, x: hitX, y: hitY, zombie: hitZombie, wandererIdx: hitWandererIdx };
            } else {
                game.fireCannon(game.cannonTarget, hitX, hitY, hitZombie, hitWandererIdx);
            }
            return;
        }

        // 点击准备好的加农炮优先进入瞄准
        const stack = game.grid[row][col];
        if (stack && stack.length > 0) {
            const top = stack[stack.length - 1];
            if (top.type === 'corncannon' && top.cannonReady) {
                game.cannonTarget = top;
                setEmojiCursor('🎯');
                return;
            }
        }

        if (game.selectedPlant) {
            game.handleGridClick(row, col);
        }
    });

    // Seed selection
    document.querySelectorAll('.seed-packet').forEach(packet => {
        if (packet.id === 'shovel-btn') return;
        packet.addEventListener('click', () => {
            if (packet.classList.contains('cooldown')) return;
            game.shovelMode = false;
            document.getElementById('shovel-btn').classList.remove('selected');
            document.querySelectorAll('.seed-packet').forEach(p => p.classList.remove('selected'));
            game.selectedPlant = packet.dataset.plant;
            packet.classList.add('selected');
            setEmojiCursor(PLANT_EMOJI[game.selectedPlant]);
        });
    });

    // Shovel
    document.getElementById('shovel-btn').addEventListener('click', () => {
        game.shovelMode = !game.shovelMode;
        document.getElementById('shovel-btn').classList.toggle('selected', game.shovelMode);
        if (game.shovelMode) {
            game.selectedPlant = null;
            document.querySelectorAll('.seed-packet').forEach(p => p.classList.remove('selected'));
            setEmojiCursor(PLANT_EMOJI.shovel);
        } else {
            setEmojiCursor(null);
        }
    });

    // Plant count control
    const countInput = document.getElementById('plant-count-input');
    document.getElementById('plant-count-dec').addEventListener('click', () => {
        game.plantCount = Math.max(1, game.plantCount - 1);
        countInput.value = game.plantCount;
    });
    document.getElementById('plant-count-inc').addEventListener('click', () => {
        game.plantCount = Math.min(1000000, game.plantCount + 1);
        countInput.value = game.plantCount;
    });
    countInput.addEventListener('change', () => {
        game.plantCount = Math.min(1000000, Math.max(1, parseInt(countInput.value) || 1));
        countInput.value = game.plantCount;
    });
    countInput.addEventListener('click', (e) => e.stopPropagation());
}
