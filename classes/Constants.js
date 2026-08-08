export const PLANT_EMOJI = {
    peashooter: '🌱',
    sunflower: '🌻',
    wallnut: '🌰',
    iceshooter: '❄️',
    doubleshooter: '🌿',
    cherry: '🍒',
    potato: '🥔',
    pitcher: '🎯',
    glue: '🧿',
    obsidian: '🗿',
    gatling: '🔫',
    waterdrop: '💧',
    corncannon: '🌽',
    primitivepea: '🌟',
    triplepea: '🌳',
    nutbowling: '🥥',
    cabbagepult: '🥬',
    magnetshroom: '🧲',
    supermg: '🪖',
    elecmg: '⚡',
    iceshroom: '🍄',
    doomshroom: '☠️',
    sunemperor: '👑',
    peabomb: '💣',
    plantfood: '💚',
    redfood: '❤️',
    shovel: '🪏',
};

export const PLANT_COSTS = {
    peashooter: 0,
    sunflower: 0,
    wallnut: 0,
    iceshooter: 0,
    doubleshooter: 0,
    cherry: 0,
    potato: 0,
    pitcher: 0,
    glue: 0,
    obsidian: 0,
    gatling: 0,
    waterdrop: 0,
    corncannon: 0,
    primitivepea: 0,
    triplepea: 0,
    nutbowling: 0,
    cabbagepult: 0,
    magnetshroom: 0,
    supermg: 0,
    elecmg: 0,
    iceshroom: 0,
    doomshroom: 0,
    sunemperor: 0,
    peabomb: 0,
    plantfood: 0,
    redfood: 0,
};

export const PLANT_COOLDOWNS = {
    peashooter: 0,
    sunflower: 0,
    wallnut: 0,
    iceshooter: 0,
    doubleshooter: 0,
    cherry: 0,
    potato: 0,
    pitcher: 0,
    glue: 0,
    obsidian: 0,
    gatling: 0,
    waterdrop: 0,
    corncannon: 0,
    primitivepea: 0,
    triplepea: 0,
    nutbowling: 0,
    cabbagepult: 0,
    magnetshroom: 0,
    supermg: 0,
    elecmg: 0,
    iceshroom: 0,
    doomshroom: 0,
    sunemperor: 0,
    peabomb: 0,
    plantfood: 0,
    redfood: 0,
};

export function setEmojiCursor(emoji) {
    if (!emoji) {
        document.body.style.cursor = '';
        return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 20, 22);
    document.body.style.cursor = `url(${canvas.toDataURL()}) 20 20, auto`;
}
