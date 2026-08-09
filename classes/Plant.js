import { Entity } from './Entity.js';
import { runPlantBehavior } from './PlantBehaviors.js';
import { PLANT_TIPS } from './Tooltip.js';

export class Plant extends Entity {
    constructor(x, y, type) {
        super(x, y, 80, 100);
        this.type = type;
        this.timer = 0;

        if (type === 'house') {
            // 房子：种在僵尸够不着的蓝色区域，血量给足，纯粹当个据点
            this.health = 9999999;
            this.maxHealth = 9999999;
        } else if (type === 'sunemperor') {
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
 glue: '🧿', obsidian: '🗿', gatling: '🔫', waterdrop: '💧',
            corncannon: '🌽', primitivepea: '🌟', triplepea: '🌳',
            nutbowling: '🥥', magnetshroom: '🧲',
            // 卷心菜投手：圆卷心菜架在投石座上，和西瓜 / 玉米投手一套长相
            cabbagepult: '<span class="cabbage-pult"><i class="cp-cabbage"></i><i class="cp-base"></i></span>',
            // 超级机枪：豌豆本体上扣一顶钢盔，见 style.css 的 .helmet-pea
            supermg: '<span class="helmet-pea">🫛<span class="hp-helmet">🪖</span></span>',
            // 超级电能机枪豌豆：同一顶钢盔，豌豆本体染成青色（.elec-pea）
            elecmg: '<span class="helmet-pea elec-pea">🫛<span class="hp-helmet">🪖</span></span>',
            // 火炬树桩：一截树桩顶着一团火焰，都是 CSS 画的，见 .torch-wood
            torchwood: '<span class="torch-wood"><i class="tw-flame"></i><i class="tw-stump"></i></span>',
            // 玉米投手：玉米棒架在投石座上，大招时探出炮管
            kernelpult: '<span class="kernel-pult"><i class="kp-barrel"></i><i class="kp-corn"></i><i class="kp-base"></i></span>',
            // 西瓜投手：绿条纹西瓜架在投石座上，大招时探出炮管
            melonpult: '<span class="melon-pult"><i class="mp-barrel"></i><i class="mp-melon"></i><i class="mp-base"></i></span>',
            // 超级投手：卷心菜 / 西瓜 / 玉米三个投手摞成一摞（都是 CSS 画的）
            pitcher: '<span class="super-pult"><i class="sp-cabbage"></i><i class="sp-melon"></i><i class="sp-corn"></i><i class="sp-stump"></i></span>',
            // 房子：红瓦白墙 + 一扇窗一扇门，整栋 CSS 画的
            house: '<span class="house-plant"><i class="hp-roof"></i><i class="hp-wall"><i class="hp-win"></i><i class="hp-door"></i></i></span>',
            // 礼物盒：红白相间的盒子 + 一条竖丝带和一个蝴蝶结
            giftbox: '<span class="gift-box"><i class="gb-lid"></i><i class="gb-body"></i><i class="gb-ribbon"></i><i class="gb-bow"></i></span>',
            // 豌豆炸弹：左边双重射手的脸、右边豌豆的脸，中间一根樱桃梗
            peabomb: '<span class="pea-bomb"><i class="pb-stem"></i><span class="pb-face l">🌿</span><span class="pb-face r">🌱</span></span>',
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

        // 红叶素：这 5 秒里打出来的都是小红樱桃，到点恢复原来的样子
        if (this.redMs && this.redMs > 0) {
            this.redMs -= (game.deltaTime || 16);
            if (this.redMs <= 0) {
                this.redMs = 0;
                if (this.element) this.element.classList.remove('redfood');
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
