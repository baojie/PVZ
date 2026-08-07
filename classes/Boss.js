// 将王博士机甲 🤖 —— 普通模式唯一的敌人来源。
//
// 循环两个阶段：
//   放僵尸（10 秒，无敌）—— 每 0.5 秒放一只，一波 20 只，从弱到强依次排列
//   低头（8 秒，可攻击）—— 放完一波就低头，把脑袋送到植物打得到的高度
// 也就是说：没低头的时候、以及低头结束后的 10 秒里，植物都够不着他，
// 他会一直往外放僵尸。想打他只有低头那一段窗口。
//
// 他体型非常高大，站在棋盘最右侧，纵向几乎占满整片草坪。

import { Zombie } from './Zombie.js';

export const BOSS_HP = 64000000;   // 6400 万
export const ZOMBIES_PER_WAVE = 20;

// 兜底：万一还有伤害是 Infinity 的弹种（以前水滴 / 黑曜石 / 超级投手都是），
// 打博士时按一只僵尸的满血折算，免得一颗就把血条打光。
// 现在 Projectile 里所有弹种统一 17000 伤害，这条折算实际用不上了。
export const BOSS_SENTINEL_DAMAGE = 800;

const SPAWN_PHASE_MS = 10000;                                  // 放僵尸阶段总时长
const SPAWN_INTERVAL = SPAWN_PHASE_MS / ZOMBIES_PER_WAVE;      // 每 500ms 一只
const BOW_MS = 8000;                                           // 低头（可攻击）时长

const BOSS_W = 250;
const BOSS_H = 470;

// 一波里僵尸的出场顺序：从弱到强。护甲越厚越靠后，最后压轴铁门。
const STRENGTH_ORDER = ['normal', 'cone', 'bucket', 'newspaper', 'polevault', 'door'];

// 把一波 n 只按 STRENGTH_ORDER 均匀铺开，得到一条从弱到强的出场序列
export function waveLineup(n) {
    const lineup = [];
    for (let i = 0; i < n; i++) {
        const t = STRENGTH_ORDER[Math.min(STRENGTH_ORDER.length - 1,
                                          Math.floor(i / n * STRENGTH_ORDER.length))];
        lineup.push(t);
    }
    return lineup;
}

export class Boss {
    constructor(game) {
        this.game = game;
        this.health = BOSS_HP;
        this.maxHealth = BOSS_HP;
        this.width = BOSS_W;
        this.height = BOSS_H;
        this.markedForDeletion = false;

        const boardH = game.height * game.cellHeight;
        this.x = game.boardWidth - BOSS_W + 70;   // 略微探出右边界，显得他挤满整个屏幕
        this.y = (boardH - BOSS_H) / 2;

        this.phase = 'spawn';          // 'spawn' | 'bow'
        this.phaseTimer = 0;
        this.spawnTimer = 0;
        this.spawnedInWave = 0;
        this.wave = 1;
        this.lineup = waveLineup(this.waveSize());

        this._buildDOM();
        this._render();
    }

    // 僵尸数量设置仍然生效：一波 20 只 × 倍率
    waveSize() {
        const m = this.game.zombieCountMultiplier || 1;
        return Math.max(1, Math.round(ZOMBIES_PER_WAVE * m));
    }

    get vulnerable() {
        return this.phase === 'bow';
    }

    _buildDOM() {
        const el = document.createElement('div');
        el.className = 'boss';
        el.style.left = `${this.x}px`;
        el.style.top = `${this.y}px`;
        el.style.width = `${BOSS_W}px`;
        el.style.height = `${BOSS_H}px`;
        el.dataset.tip = '将王博士机甲 — 只有低头时才打得到';
        el.innerHTML = `
            <div class="boss-hp">
                <div class="boss-hp-fill"></div>
                <span class="boss-hp-text"></span>
            </div>
            <div class="boss-rig">
                <div class="boss-head">🧟</div>
                <div class="boss-mech">🤖</div>
            </div>
            <div class="boss-state"></div>`;
        this.game.board.appendChild(el);

        this.element = el;
        this.hpFill = el.querySelector('.boss-hp-fill');
        this.hpText = el.querySelector('.boss-hp-text');
        this.stateLabel = el.querySelector('.boss-state');
    }

    _render() {
        const ratio = Math.max(0, this.health / this.maxHealth);
        this.hpFill.style.width = `${ratio * 100}%`;
        this.hpText.textContent = `${Math.max(0, Math.round(this.health))} / ${this.maxHealth}`;
        this.element.classList.toggle('bowing', this.vulnerable);
        this.stateLabel.textContent = this.vulnerable ? '低头中 — 快打他!' : '无敌 · 放僵尸中';
    }

    update(game) {
        if (this.markedForDeletion) return;
        const dt = game.deltaTime || 16;
        this.phaseTimer += dt;

        if (this.phase === 'spawn') {
            this.spawnTimer += dt;
            while (this.spawnTimer >= SPAWN_INTERVAL && this.spawnedInWave < this.lineup.length) {
                this.spawnTimer -= SPAWN_INTERVAL;
                this._releaseZombie(game);
            }
            if (this.spawnedInWave >= this.lineup.length) this._startBow();
        } else if (this.phaseTimer >= BOW_MS) {
            this._startSpawn();
        }

        this._render();
    }

    _releaseZombie(game) {
        const type = this.lineup[this.spawnedInWave++];
        const row = Math.floor(Math.random() * game.height);
        const y = row * game.cellHeight;
        game.zombies.push(new Zombie(game.boardWidth, y, type, game.zombieSpeedMultiplier));

        // 舱门开合的抖动，示意「又吐出来一只」
        this.element.classList.remove('boss-release');
        this.element.classList.add('boss-release');
        setTimeout(() => this.element?.classList.remove('boss-release'), 260);
    }

    _startBow() {
        this.phase = 'bow';
        this.phaseTimer = 0;
        this.game.sound?.playExplosion();
    }

    _startSpawn() {
        this.phase = 'spawn';
        this.phaseTimer = 0;
        this.spawnTimer = 0;
        this.spawnedInWave = 0;
        this.wave++;
        this.lineup = waveLineup(this.waveSize());
    }

    // 只有低头时才吃伤害。没低头就是够不着，伤害直接吞掉。
    takeDamage(amount) {
        if (!this.vulnerable || this.markedForDeletion) return false;
        this.health -= amount;
        this.element.classList.remove('boss-hit');
        this.element.classList.add('boss-hit');
        setTimeout(() => this.element?.classList.remove('boss-hit'), 200);
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
        this._render();
        return true;
    }

    die() {
        this.markedForDeletion = true;
        this.element?.classList.add('boss-dead');
        setTimeout(() => this.element?.remove(), 900);
    }

    remove() {
        this.markedForDeletion = true;
        this.element?.remove();
    }
}
