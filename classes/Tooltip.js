// Lightweight global hover tooltip. Any element with a `data-tip` attribute
// shows a label near the cursor on hover. Used for seed cards, plants,
// zombies, and the lawnmower.

export const PLANT_TIPS = {
    peashooter:    '豌豆射手 — 同行直射',
    sunflower:     '向日葵 — 持续产阳光',
    wallnut:       '坚果墙 — 高血量肉盾',
    iceshooter:    '寒冰射手 — 命中减速 30%，打中将王博士能把他停住 2 秒',
    doubleshooter: '双发射手 — 一次两颗豌豆',
    cherry:        '樱桃炸弹 — 0.8 秒后 3×3 秒杀',
    potato:        '土豆地雷 — 3 秒后踩中即炸',
    glue:          '黑胶神 — 穿行黑胶，近乎冻结',
    obsidian:      '黑曜石战神 — 上中下三行扫射',
    pitcher:       '超级投手 — 穿透整行',
    gatling:       '机枪炮台 — 4 连射扫三行',
    waterdrop:     '水滴 — 每秒一发，无视护盾秒杀',
    corncannon:    '究极玉米炮 — 自动追踪连续轰炸',
    primitivepea:  '原始豌豆 — 70 伤 + 眩晕击退',
    triplepea:     '三重豌豆 — 三行各一颗',
    nutbowling:    '坚果保龄 — 2 秒后沿当前行碾压',
    cabbagepult:   '卷心菜投手 — 每 0.8 秒投一颗卷心菜，40 伤',
    magnetshroom:  '磁力菇 — 每 1.5 秒击退全场僵尸，再吸到自己这一行',
    supermg:       '超级机枪 — 0.5 秒 6 连发；喂绿叶素永久 +1 连，大招那 2 秒里每点一下再 +1；每 5 轮自动散射 150 连',
    elecmg:        '超级电能机枪豌豆 — 0.5 秒 6 连发无限贯穿电能弹（僵尸无限伤害 / 博士 1800 起步，随递增涨到 18000）；每 5 轮自动散射 150 连，且连发数永久 +1',
    iceshroom:     '寒冰菇 — 每 5 秒寒冰爆炸：全场 2 点伤害 + 冻住 5 秒，将王博士也一起停住；绿叶素放冰暴，每次爆炸间隔永久 −1 秒',
    doomshroom:    '毁灭菇 — 每 5 秒紫色蘑菇云爆炸，全场 1800 点伤害；自己会一直慢慢长大，每喂一次绿叶素伤害永久 +1800 还窜一截',
    sunemperor:    '阳光帝果 — 血量无限。点一下花 500 阳光：回满血 + 在前面那一格攒一颗黄色保龄球，3 秒后滚出去；滚之前每点一下这颗球更大一圈，滚完下一颗从最小重来。绿叶素放一大片最小号保龄球',
    torchwood:     '火炬树桩 — 豌豆类子弹穿过它会被点着，伤害 ×2；每喂一次绿叶素火焰换一种彩虹色、倍率翻倍：红2→蓝4→紫8→橙16→黄32→绿64→青128（青火到顶）',
    peabomb:       '豌豆炸弹 — 种下 3 秒后自爆，100 颗豌豆围成两圈一起朝四面射出去；绿叶素满地召唤射豌豆的植物，红叶素改射樱桃子弹',
    melonpult:     '西瓜投手 — 每 1.2 秒抛一颗越过障碍物的西瓜（100 伤）；绿叶素变西瓜狙击炮，场上几只僵尸就打几发巨型西瓜（700 伤）；红叶素改打巨型红樱桃（一万伤）',
    house:         '房子 — 哪块地都能种；蓝草坪只种得下它。喂绿叶素会在草坪上随机一格送出礼物盒',
    giftbox:       '礼物盒 — 空手点一下拆开，变成除房子外的任意一种植物',
    plantfood:     '绿叶素 — 点植物开 2 秒大招（攻速 ×20）',
    redfood:       '红叶素 — 点植物让它打 5 秒小红樱桃（每颗 1000 伤害），到点恢复原样',
};

export const ZOMBIE_TIPS = {
    normal:    '普通僵尸',
    cone:      '路障僵尸 — 锥形路障护甲',
    bucket:    '铁桶僵尸 — 高耐久护甲',
    newspaper: '报纸僵尸 — 报纸破后狂暴加速',
    polevault: '撑杆跳僵尸 — 首次遇植物跳过',
    door:      '铁门僵尸 — 铁门挡两次伤害',
    wanderer:  '游荡者 — 自由穿行的强力僵尸',
};

export function setupTooltip() {
    if (document.getElementById('game-tooltip')) return;
    const tip = document.createElement('div');
    tip.id = 'game-tooltip';
    tip.className = 'hidden';
    document.body.appendChild(tip);

    let current = null;

    document.addEventListener('mouseover', (e) => {
        const t = e.target.closest('[data-tip]');
        if (!t || t === current) return;
        current = t;
        tip.textContent = t.dataset.tip;
        tip.classList.remove('hidden');
    });
    document.addEventListener('mouseout', (e) => {
        const t = e.target.closest('[data-tip]');
        if (!t) return;
        if (e.relatedTarget && t.contains(e.relatedTarget)) return;
        current = null;
        tip.classList.add('hidden');
    });
    document.addEventListener('mousemove', (e) => {
        if (tip.classList.contains('hidden')) return;
        const pad = 14;
        let x = e.clientX + pad;
        let y = e.clientY + pad;
        const r = tip.getBoundingClientRect();
        if (x + r.width > window.innerWidth)  x = e.clientX - r.width - pad;
        if (y + r.height > window.innerHeight) y = e.clientY - r.height - pad;
        tip.style.left = `${x}px`;
        tip.style.top = `${y}px`;
    });
}
