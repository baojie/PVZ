// PVZ headless playthrough — opens the game, plays a normal round against
// 报纸将王 and saves screenshots to ../screenshot/.
//
// Usage:
//   ./run.sh -d 1644           # run the static server
//   node bot/play.js           # run this bot (requires puppeteer-core)
//
// puppeteer-core is loaded from /tmp/pvz-bot/node_modules/puppeteer-core
// (kept out of the project so node_modules doesn't pollute the repo).

const path = require('path');
const fs = require('fs');

const PUPPETEER_PATH = process.env.PVZ_PUPPETEER_PATH
  || '/tmp/pvz-bot/node_modules/puppeteer-core';
const puppeteer = require(PUPPETEER_PATH);

const URL = process.env.PVZ_URL || 'http://localhost:1644/index.html';
const OUT = path.resolve(__dirname, '../screenshot');
const SHOTS = '/tmp/pvz-shots';
fs.mkdirSync(SHOTS, { recursive: true });
for (const f of fs.readdirSync(SHOTS)) fs.unlinkSync(path.join(SHOTS, f));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.PVZ_CHROMIUM || '/usr/bin/chromium-browser',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--ozone-platform=x11'],
    defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 1 },
  });

  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  console.log('→ load', URL);
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 15000 });
  await sleep(400);

  const clip = await page.evaluate(() => {
    const el = document.getElementById('game-container');
    const r = el.getBoundingClientRect();
    return {
      x: Math.max(0, r.x - 8),
      y: Math.max(0, r.y - 8),
      width: r.width + 16,
      height: r.height + 16,
    };
  });
  const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.png`, clip });

  await shot('01-start');

  // Tune settings on the start screen — round 2 inherits them.
  await page.click('.tab-btn[data-tab="settings"]');
  await sleep(150);
  await page.evaluate(() => {
    document.querySelector('#zombie-count-setting .opt-btn[data-value="1"]').click();
    document.querySelector('#wave-setting .opt-btn[data-value="6"]').click();
    const slider = document.getElementById('zombie-speed');
    slider.value = '1';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(120);
  await shot('02-settings');

  // 普通版：报纸将王开局就站在棋盘最右侧，僵尸全由他放出来。
  await page.click('#start-btn');
  await page.waitForFunction(
    () => window.game && window.game.isRunning === true && !!window.game.boss,
    { timeout: 5000 }
  );
  await sleep(600);
  await shot('03-boss-entrance');
  console.log('boss on board at t=0');
  await shot('04-round2-empty');

  async function plant(key, row, col) {
    return page.evaluate(({ key, row, col }) => {
      const seed = document.querySelector(`.seed-packet[data-plant="${key}"]`);
      if (!seed) return 'no-seed';
      seed.click();
      const cell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
      if (!cell) return 'no-cell';
      cell.click();
      if (window.game) window.game.selectedPlant = null;
      return 'ok';
    }, { key, row, col });
  }

  // Layered defense covering the full lawn. col 0 already has 5 random
  // plants from start(); we layer in shooters cols 1-3, wall col 4, and
  // a back-row of triple-pea / waterdrop / double cols 5-7.
  const layout = [];
  for (let r = 0; r < 5; r++) {
    layout.push(['sunflower', r, 1]);
    layout.push(['peashooter', r, 2]);
    layout.push(['doubleshooter', r, 3]);
    layout.push(['wallnut', r, 4]);
    layout.push(['triplepea', r, 5]);
    layout.push(['iceshooter', r, 6]);
    layout.push(['waterdrop', r, 7]);
  }
  for (const [k, r, c] of layout) {
    await plant(k, r, c);
    await sleep(50);
  }
  await sleep(400);
  await shot('05-round2-defense');
  console.log('round 2 defense placed');

  // Auto-play: cherry-bomb on the most-advanced zombie every 10s.
  const totalSec = 90;
  let ended = false;
  for (let s = 1; s <= totalSec; s++) {
    await sleep(1000);

    const st = await page.evaluate(() => {
      const g = window.game;
      const goVisible = !document.getElementById('game-over-screen').classList.contains('hidden');
      const vVisible = !document.getElementById('victory-screen').classList.contains('hidden');
      return g
        ? { wave: g.waveIndex, zombies: g.zombies?.length, plants: g.plants?.length, running: g.isRunning, won: g.won, gameOver: goVisible, victory: vVisible }
        : null;
    });
    if (s <= 5 || s % 5 === 0) console.log(`t=${s}s`, JSON.stringify(st));

    if (s % 10 === 0) {
      await page.evaluate(() => {
        const g = window.game;
        if (!g || !g.zombies?.length) return;
        let best = g.zombies[0];
        for (const z of g.zombies) if (z.x > best.x) best = z;
        const seed = document.querySelector('.seed-packet[data-plant="cherry"]');
        if (!seed) return;
        seed.click();
        const col = Math.max(0, Math.min(8, Math.round(best.x / g.cellWidth)));
        const cell = document.querySelector(`.grid-cell[data-row="${best.row}"][data-col="${col}"]`);
        if (cell) cell.click();
        g.selectedPlant = null;
      });
    }

    if ([10, 20, 35, 55, 80].includes(s)) {
      await shot(`06-round2-t${String(s).padStart(2, '0')}s`);
    }
    if (st && (st.gameOver || st.victory)) {
      console.log('round 2 ended at t=' + s, 'gameOver?', st.gameOver, 'victory?', st.victory);
      await shot(`06-round2-end-t${s}s`);
      ended = true;
      break;
    }
  }
  if (!ended) await shot('07-round2-final');

  // ---------- Wanderer-mode pass ----------
  // Reload the page to get back to the start screen with a fresh game,
  // then click 游荡者 (wandererMode has no boss — zombies come from WandererSystem).
  console.log('→ wanderer mode');
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 15000 });
  await sleep(400);
  await page.click('#start-wanderer-btn');
  await page.waitForFunction(
    () => window.game && window.game.isRunning === true && window.game.wandererMode === true,
    { timeout: 5000 }
  );
  await sleep(400);
  await shot('08-wanderer-empty');

  // Same defense layout works fine here.
  for (const [k, r, c] of layout) {
    await plant(k, r, c);
    await sleep(50);
  }
  await sleep(400);
  await shot('09-wanderer-defense');
  console.log('wanderer defense placed');

  // Wanderer mode has no waves; let it run for ~60s and snap mid + late.
  for (let s = 1; s <= 60; s++) {
    await sleep(1000);
    if (s % 10 === 0) {
      const wstat = await page.evaluate(() => {
        const g = window.game;
        const wn = g?.wandererSystem?.wanderers?.length;
        return { plants: g?.plants?.length, wanderers: wn, running: g?.isRunning };
      });
      console.log(`wanderer t=${s}s`, JSON.stringify(wstat));
    }
    if (s === 20) await shot('10-wanderer-mid');
    if (s === 50) await shot('11-wanderer-late');
  }

  // Export the meaningful round 2 + wanderer shots.
  for (const [src, suffix] of [
    ['06-round2-t20s', 'round2-mid'],
    ['07-round2-final', 'round2-final'],
    ['10-wanderer-mid', 'wanderer-mid'],
    ['11-wanderer-late', 'wanderer-late'],
  ]) {
    const p = `${SHOTS}/${src}.png`;
    if (fs.existsSync(p)) {
      const dst = `${OUT}/v3.1-${suffix}.png`;
      fs.copyFileSync(p, dst);
      console.log('saved', dst);
    }
  }

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
