# bot/

Headless playthrough of the PVZ web game using puppeteer-core + the system
Chromium. Captures screenshots into `../screenshot/`.

## Setup (once)

```sh
mkdir -p /tmp/pvz-bot && cd /tmp/pvz-bot
npm init -y
npm install puppeteer-core
```

## Run

```sh
./start.sh -d 1644          # static server in daemon mode
node bot/play.js            # opens game, plays round 2, screenshots
```

Round 1 auto-wins by design (`app.js:160-165`); the bot waits for that, clicks
"再来一局", then plays round 2 with a basic sun/pea/wallnut defense and a cherry
bomb on the front-most zombie every 10 s.

Env overrides:

- `PVZ_URL` — default `http://localhost:1644/index.html`
- `PVZ_CHROMIUM` — default `/usr/bin/chromium-browser`
- `PVZ_PUPPETEER_PATH` — default `/tmp/pvz-bot/node_modules/puppeteer-core`
