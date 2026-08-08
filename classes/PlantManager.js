import { Plant } from './Plant.js';
import { PLANT_COSTS, PLANT_COOLDOWNS } from './Constants.js';
import { updateSunDisplay } from './SunManager.js';

const RED_FOOD_MS = 5000;   // 红叶素持续多久

// 蓝草坪（最左边 game.blueCols 列）只能种房子，别的植物一概种不下去；
// 房子则是哪儿都能种。规则放在这儿，满屏铺植物的那些大招也一并受管。
export function canPlantAt(game, col, type) {
    return type === 'house' || col >= (game.blueCols || 0);
}

export function spawnPlant(game, row, col, type) {
    if (!canPlantAt(game, col, type)) return null;
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

export function usePlantFood(game, row, col) {
    const stack = game.grid[row][col];
    const top = stack && stack.length > 0 ? stack[stack.length - 1] : null;
    if (top && !top.markedForDeletion) {
        top.ultimateMs = 2000;
        if (top.element) top.element.classList.add('ultimate');
        game.showNotEnoughFeedback('💚 大招！');
    } else {
        game.showNotEnoughFeedback('需要点在植物上');
    }
}

// 红叶素：点在植物上，让它接下来 5 秒打出小红樱桃，然后恢复原样
export function useRedFood(game, row, col) {
    const stack = game.grid[row][col];
    const top = stack && stack.length > 0 ? stack[stack.length - 1] : null;
    if (top && !top.markedForDeletion) {
        top.redMs = RED_FOOD_MS;
        if (top.element) top.element.classList.add('redfood');
        game.showNotEnoughFeedback('❤️ 红樱桃 5 秒!');
    } else {
        game.showNotEnoughFeedback('需要点在植物上');
    }
}

export function handleGridClick(game, row, col) {
    if (game.selectedPlant === 'plantfood') {
        usePlantFood(game, row, col);
        return;
    }

    if (game.selectedPlant === 'redfood') {
        useRedFood(game, row, col);
        return;
    }

    if (!canPlantAt(game, col, game.selectedPlant)) {
        game.showNotEnoughFeedback('🏠 蓝草坪只能种房子!');
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
        updateSunDisplay(game);
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
