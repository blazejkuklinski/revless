# Revless

[Visit Revless at revless.app](https://revless.app)

Revless is a browser-based driving dashboard for EV drivers who miss the sound of a combustion engine. It uses GPS speed to simulate gear changes and RPM, then adjusts the pitch of the engine audio as you accelerate and shift. Its **Performance test** also uses GPS to time your 0–100 km/h and quarter-mile runs and track your personal bests.

## What it does

- Shows your speed, simulated gear and RPM, and position on a live map.
- Offers Growl, Vroom, and XSpace engine sounds, with an option to mute them.
- Lets you tune the virtual transmission with a configurable top speed, gear count, maximum RPM, and redline. Choose Chill, Standard, or Sport to change how it shifts.
- Tracks trip stats alongside the live dashboard.

Revless derives gear and RPM from speed, so it requires no connection to vehicle telemetry. GPS coordinates stay in the browser, while map tile requests reveal the approximate area to the map provider. Settings are saved locally. The map uses MapLibre GL JS and OpenFreeMap.

## Performance test

Choose a **0–100 km/h (about 62 mph)** acceleration test or a **quarter-mile** run. Revless estimates elapsed time from GPS speed samples, starting from a standstill without rollout. Compare your latest run with your best result for each test.

## Use the app

1. Open [revless.app](https://revless.app) in a browser with location access and audio playback. If using a phone, pair it with your car and select Bluetooth audio as the car's media source.
2. Grant location permission when prompted to track GPS speed and trip stats. Tap **Ignite** to enable engine audio.

The browser needs to report GPS speed for the dashboard to respond to movement. Some devices provide coordinates without a speed reading.

## Run locally

Install Node.js 20.19+ in the 20.x series or Node.js 22.12+ and npm, then run these commands from the repository root.

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. Use **Speed control** on localhost to simulate speed while testing the dashboard and engine sounds.

For GPS testing on a phone, stop the dev server and run:

```sh
npm run dev:https
```

Open Vite's HTTPS Network URL on a phone connected to the same network. Browser geolocation requires a secure context such as HTTPS or localhost. You may need to trust the local development certificate on your phone before the browser will grant location access.

To type-check the app and create a production build in `dist/`, run:

```sh
npm run build
```

## Support Revless

- [Buy me a coffee](https://buymeacoffee.com/bajo)
- [Tesla referral](https://www.tesla.com/pl_pl/referral/baej574307)
