import { Entity } from './Entity.js';
import { runPlantBehavior } from './PlantBehaviors.js';
import { PLANT_TIPS } from './Tooltip.js';

export class Plant extends Entity {
    constructor(x, y, type) {
        super(x, y, 80, 100);
        this.type = type;
        this.timer = 0;

        if (type === 'sunemperor') {
            // 阳光帝果：血量无限，谁也啃不动
            this.health = Infinity;
            this.maxHealth = Infinity;
        } else if (type === 'wallnut') {
            this.health = 9999999;
            this.maxHealth = 9999999;
        } else if (type === 'glue') {
            this.health = 600;
            this.maxHealth = 600;
        } else if (type === 'obsidian') {
            this.health = 800;
            this.maxHealth = 800;
        } else if (type === 'gatling') {
            this.health = 1000;
            this.maxHealth = 1000;
        } else if (type === 'waterdrop') {
            this.health = 300;
            this.maxHealth = 300;
        } else if (type === 'corncannon') {
            this.health = 1000;
            this.maxHealth = 1000;
            this.cannonReady = true;
            this.cannonTimer = 0;
        } else {
            this.health = 100;
            this.maxHealth = 100;
        }

        this.count = 1;
        this.fusionLevel = 1;

        // Potato mine: starts unarmed, arms after 3 seconds
        this.armed = type !== 'potato';
        this.armTimer = 0;

        // Visuals
        const icons = {
            peashooter: '🌱', sunflower: '🌻', wallnut: '🌰',
            iceshooter: '❄️', doubleshooter: '🌿', cherry: '🍒', potato: '🥔',
            pitcher: '🎯', glue: '🧿', obsidian: '🗿', gatling: '🔫', waterdrop: '💧',
            corncannon: '🌽', primitivepea: '🌟', triplepea: '🌳',
            nutbowling: '🥥', cabbagepult: '🥬', magnetshroom: '🧲',
            // 超级机枪：豌豆本体上扣一顶钢盔，见 style.css 的 .helmet-pea
            supermg: '<span class="helmet-pea">🫛<span class="hp-helmet">🪖</span></span>',
            // 超级电能机枪豌豆：同一顶钢盔，豌豆本体染成青色（.elec-pea）
            elecmg: '<span class="helmet-pea elec-pea">🫛<span class="hp-helmet">🪖</span></span>',
            // 阳光帝果：黄坚果 + 头顶小坚果，两颗都带向日葵花瓣，见 .sun-emperor
            sunemperor: '<span class="sun-emperor"><span class="se-nut se-small"><i class="se-petal l"></i><i class="se-petal r"></i></span><span class="se-nut se-big"><i class="se-petal l"></i><i class="se-petal r"></i></span></span>',
            // 毁灭菇：灰柄黑伞，整株都是 CSS 画的，见 .doom-shroom
            doomshroom: '<span class="doom-shroom"><span class="ds-cap"></span><span class="ds-stem"></span></span>',
            // 寒冰菇：蓝色的蘑菇，头顶顶着一排冰锥（都是 CSS 画的，见 .ice-shroom）
            iceshroom: '<span class="ice-shroom"><span class="is-cap">🍄</span><span class="is-ice"></span></span>',
        };
        let icon = icons[type] || '';

        this.createDOM(`entity plant ${type}`, `<div class="plant-inner">${icon}</div>`);
        if (this.element && PLANT_TIPS[type]) this.element.dataset.tip = PLANT_TIPS[type];
    }

    levelUpFusion() {
        this.fusionLevel++;
        if (this.element) {
            let badge = this.element.querySelector('.fusion-badge');
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'fusion-badge';
                this.element.appendChild(badge);
            }
            badge.textContent = `⭐${this.fusionLevel}`;
            this.element.style.filter = `brightness(${1 + (this.fusionLevel - 1) * 0.3}) drop-shadow(0 0 ${this.fusionLevel * 4}px gold)`;
        }
    }

    update(game) {
        const stackMult = this._stackMult || 1;
        const ultimateMult = (this.ultimateMs && this.ultimateMs > 0) ? 20 : 1;
        this.timer += game.deltaTime * this.fusionLevel * stackMult * (game.plantSpeedMultiplier || 1) * ultimateMult;
        if (this.ultimateMs && this.ultimateMs > 0) {
            this.ultimateMs -= (game.deltaTime || 16);
            if (this.ultimateMs <= 0) {
                this.ultimateMs = 0;
                if (this.element) this.element.classList.remove('ultimate');
            }
        }

        runPlantBehavior(this, game);
    }

    takeDamage(amount, force = false) {
        if (this.type === 'wallnut' && !force) return;
        this.health -= amount;
        // 受击闪烁：已经在播就不重启。重启动画要靠 void offsetWidth 强制同步布局，
        // 而僵尸是「每帧啃一口」的 —— 上百只同时开啃时，每帧会触发上百次全页布局，
        // 帧时间直接飙到几百毫秒，整局看起来就是卡死。
        // 顺带一提，每 16ms 重启一次动画，plantHit 永远播不过 20%，本来也看不全。
        if (this.element && !this._hitFlashing) {
            this._hitFlashing = true;
            this.element.classList.add('hit');
            setTimeout(() => {
                this._hitFlashing = false;
                this.element?.classList.remove('hit');
            }, 350);
        }
        if (this.health <= 0) {
            this.count--;
            if (this.count <= 0) {
                this.remove();
            } else {
                this.health = this.maxHealth;
                this.element.style.opacity = 1;
                this._updateBadge();
            }
        } else {
            this.element.style.opacity = 0.3 + (this.health / this.maxHealth) * 0.7;
        }
    }

    _updateBadge() {
        if (!this.element) return;
        let badge = this.element.querySelector('.plant-count-badge');
        if (this.count > 1) {
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'plant-count-badge';
                this.element.appendChild(badge);
            }
            badge.textContent = `×${this.count}`;
        } else if (badge) {
            badge.remove();
        }
    }
}
