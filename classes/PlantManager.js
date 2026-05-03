import { Plant } from './Plant.js';
import { PLANT_COSTS, PLANT_COOLDOWNS } from './Constants.js';

export function spawnPlant(game, row, col, type) {
    const x = col * game.cellWidth;
    const y = row * game.cellHeight;
    const plant = new Plant(x, y, type);

    game.grid[row][col].push(plant);
    game.plants.push(plant);
    updateCellDisplay(game, row, col);
    return plant;
}

export function removePlant(game, row, col) {
    const stack = game.grid[row][col];
    if (stack && stack.length > 0) {
        stack.forEach(p => p.remove());
        stack.length = 0;
        updateCellDisplay(game, row, col);
    }
    game.shovelMode = false;
    document.getElementById('shovel-btn').classList.remove('selected');
}

export function updateCellDisplay(game, row, col) {
    const stack = game.grid[row][col];
    stack.forEach((p, i) => {
        if (p.element) p.element.style.visibility = i === stack.length - 1 ? '' : 'hidden';
    });
    const cellEl = game.board.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
    if (!cellEl) return;
    let badge = cellEl.querySelector('.stack-badge');
    if (stack.length > 1) {
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'stack-badge';
            cellEl.appendChild(badge);
        }
        badge.textContent = `×${stack.length}`;
    } else if (badge) {
        badge.remove();
    }
}

export function handleGridClick(game, row, col) {
    if (game.selectedPlant === 'lvyesu') {
        const stack = game.grid[row][col];
        const top = stack && stack.length > 0 ? stack[stack.length - 1] : null;
        if (top && !top.markedForDeletion) {
            top.ultimateMs = 2000;
            if (top.element) top.element.classList.add('ultimate');
            game.showNotEnoughFeedback('💚 大招！');
        } else {
            game.showNotEnoughFeedback('需要点在植物上');
        }
        return;
    }

    const cost = PLANT_COSTS[game.selectedPlant] || 0;

    if (game.cooldowns[game.selectedPlant] > 0) {
        game.showNotEnoughFeedback('冷却中!');
        return;
    }

    const n = game.plantCount ?? 1;
    const totalCost = cost * n;

    if (game.suns >= totalCost) {
        game.suns -= totalCost;
        game.updateSunDisplay();
        const stack = game.grid[row][col];
        const top = stack[stack.length - 1];
        if (game.fusionMode && top && !top.markedForDeletion && top.type === game.selectedPlant) {
            for (let i = 0; i < n; i++) top.levelUpFusion();
        } else {
            for (let i = 0; i < n; i++) {
                spawnPlant(game, row, col, game.selectedPlant);
            }
        }
        game.cooldowns[game.selectedPlant] = PLANT_COOLDOWNS[game.selectedPlant];
        game.sound.playPlant();
    } else {
        game.showNotEnoughFeedback('阳光不足!');
    }
}
