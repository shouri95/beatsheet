# Plates

A personal nutrition and strength coach. You log what you eat by weight, scan barcodes, log lifts set by set, and your Fitbit fills in steps, sleep and weigh-ins on its own. Once a week the app checks your numbers and adjusts your targets.

It runs two ways from the same code:

- **The iPhone app** (installable web app). Add it to your Home Screen from Safari. Data lives on the phone. Adds barcode scanning, Fitbit sync through the Google Health API, and, with your own Anthropic API key, meal descriptions and photos, label reading, online label lookups and coach chat. Works offline.
- **The Claude artifact.** Runs inside Claude with your data synced to your Claude account. Claude's built-in access powers the meal, photo and label features. It has no barcode scanning or Fitbit, and can't look labels up online: artifacts can't reach other websites.

## What it does

**Setup.** Sex, age, height and weight; then optionally your body fat: upload a body-scan report (Evolt 360, InBody, DEXA; the PDF is read on the phone with pdf.js, no AI needed; photos and image-only PDFs need AI), measure your waist (relative fat mass from waist and height; add a neck measurement for the US Navy method), or skip. Adding a scan later from Progress updates your targets immediately. Then daily activity, training days, equipment, experience, a target weight and a timeframe. It suggests a target from your lean mass and tells you if the timeline isn't safe. It won't plan a loss faster than about 1% of body weight a week.

**Targets.**
- Resting burn uses Katch–McArdle when lean mass is known, Mifflin–St Jeor otherwise. Daily activity and lifting sessions are added on top.
- The deficit follows your timeline, capped at 25–30% of your daily burn and 0.5–1% of body weight per week depending on how lean you are. Calories never go below 1,500 for men or 1,200 for women.
- Protein is 2.2–2.4 g per kg of lean mass, or about 2 g per kg of body weight without a scan. Fat is at least 25% of calories. Carbs fill the rest.
- **Steps credit.** Walking more than your usual daily steps (the median of the last 4 weeks) earns back half of the extra burn, up to 250 kcal. A slow morning never takes food away. You can turn this off.

**The self-correcting part.** Every week the check-in compares what you ate with how your trend weight moved. Eating minus change in stored energy gives your real daily burn. That estimate is blended with the formula by a confidence score based on how many days you logged and weighed in, so after 2–3 weeks your targets come from your own body, not from population averages.

**Food, and why branded food is now exact.**
- 6,440 foods from the USDA National Nutrient Database for Standard Reference, 153 of them everyday items with friendly names and portion sizes.
- **Barcode scanning** looks products up in Open Food Facts. Every crowd-sourced entry is checked: calories must agree with the macros, or the app asks you to confirm against the pack.
- **Label photos** are read exactly (Claude), including kJ-only Australian and New Zealand labels.
- **Online label lookup** (API key): Claude searches the manufacturer's site and supermarket listings for the official nutrition panel and shows the source page.
- **Describing a meal** splits it into items. Branded products are never guessed from marketing words like "low carb". With an API key they're checked against their official labels online. Without one they're flagged "Brand estimate, not verified" with one-tap fixes: scan the barcode, photograph the label, or find the label online.
- Anything verified once is saved to **your foods**. The next time you describe it, scan it or search for it, the exact values are used instantly.
- Recipes take a cooked weight, so a weighed bowl is exact. The Today screen shows how much of the day's food came from verified entries.

**Training.** The program depends on training days per week: full body for 2–3 days, upper/lower for 4, upper/lower plus push/pull/legs for 5, push/pull/legs twice for 6. Exercises are picked for your equipment (full gym, home gym, or bodyweight only) and experience. Progression is double progression: once you hit the top of the rep range on every set, the weight goes up and you start again at the bottom of the range. Every fifth week is a deload. Each exercise has an animated start/finish demo, form cues, the most common mistake, a tutorial video, swaps and your history. Personal records are detected from estimated 1-rep max. Walks and runs recorded by your Fitbit count toward weekly cardio.

**Fitbit.** Steps, sleep (duration and stages), resting heart rate, workouts and smart-scale weigh-ins sync when you open the app, at most every 10 minutes. Anything you typed yourself is never overwritten. The weekly check-in and the coach use your sleep: under 7 hours a night gets flagged, because it raises hunger and makes a deficit cost more muscle.

**Belly fat.** You can't reduce fat in one spot, and the app says so. It tracks waist measurements weekly and keeps steps, cardio, protein, lifting and sleep in front of you every day, because those are what move it.

## Put it on your iPhone

The app is a static site. Any HTTPS host works; GitHub Pages is set up already.

1. **Host it.** `.github/workflows/pages.yml` builds, tests and deploys on every push to `main`. In the repository's Settings → Pages, set Source to **GitHub Actions**. GitHub Pages needs either a **public** repository or a paid GitHub plan. The code has no secrets: keys and your data stay on your phone. If you'd rather keep the repo private on a free plan, connect it to Cloudflare Pages or Netlify instead (build command `npm run build`, output folder `dist`).
2. **Install it.** Open the site in **Safari** on your iPhone, tap Share → **Add to Home Screen**. Use it from the Home Screen icon from then on. On iPhone, Safari and the Home Screen app keep separate data.
3. **Open straight to logging.** The Home Screen icon opens "What are you eating?" with your recent foods, yesterday's meal, barcode, meal photo, label and quick add. You can change this in Plan & settings → App. A true live widget showing calories left on the Home Screen would need a native iOS app built in Xcode with an Apple developer account; web apps can't add widgets. iOS Shortcuts can't open a Home Screen web app either (they open Safari, which has none of your data).
4. **Move your data from the Claude version.** In the artifact: Plan & settings → Export backup. In the app: Restore from a Plates backup, on the welcome screen or in settings.

### Connect Fitbit (about 10 minutes, once)

Google turned off the old Fitbit Web API on 2 November 2026; Fitbit data now comes from the [Google Health API](https://developers.google.com/health). Access goes through a Google Cloud project you own. The app walks you through it in Plan & settings → Fitbit:

1. Create a Google Cloud project, enable **Google Health API**.
2. Google Auth Platform: External audience, add your Gmail as a test user, add the scopes `activity_and_fitness.readonly`, `sleep.readonly` and `health_metrics_and_measurements.readonly`.
3. Create a **Web application** client with the redirect URI the app shows you (your app's address, e.g. `https://<you>.github.io/beatsheet/`).
4. Paste the client ID and secret into the app and connect.

While the Google project is in Testing, Google signs you out every 7 days. Publishing it (it stays unverified, which is fine for up to 100 users) stops that; you'll see a "Google hasn't verified this app" screen once.

### AI features (optional)

Plan & settings → AI features → paste an Anthropic API key from console.anthropic.com. It's stored only on the phone and sent only to `api.anthropic.com`. The default model is Claude Opus 5.5: about 1–3 cents to estimate a meal, a few cents with online label lookups. Sonnet 5.5 and Haiku 5.5 are cheaper options. Server-side refusal fallback is enabled on Opus and Sonnet.

## Develop

```sh
npm install
npm run dev          # rebuilds on change and serves http://localhost:4173
npm test             # engine, program and Fitbit mapping tests
npm run build        # writes dist/
```

`dist/index.html` is the installable app; `dist/artifact.html` is the Claude artifact page.

## Accuracy, honestly

No app can make food tracking 100% accurate, but you can get close:

1. **Weigh food in grams** on a kitchen scale, and pick the matching state: "cooked" and "uncooked" rice differ by nearly 3×.
2. **Use the label for packaged food.** Scan or photograph it once and it's exact from then on.
3. **Weigh yourself most mornings,** or let a Fitbit-connected scale do it. The trend line, not any single weigh-in, drives the adjustments.
4. **Log every day, even roughly.** Gaps make the adaptive estimate wait.

Meal descriptions and photos of generic food are estimates (typically within 20–30%) and are marked as such. Fitbit's own calorie-burn figure is stored for reference but not used for your targets; the adaptive estimate from your weight is more accurate.

This is general fitness guidance, not medical advice.

## Code

[Preact](https://preactjs.com) and [htm](https://github.com/developit/htm), bundled by esbuild. The barcode decoder ([ZXing](https://github.com/zxing-js/library)) and the [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) load only when used.

```
app/
  engine.js        all the maths: body fat, burn, plan, trend, adaptive burn, step credit, label checks (pure, tested)
  program.js       splits, exercise selection, progression, PRs (pure, tested)
  coach.js         weekly review notes, daily tips, AI context
  foods.js         search, recipes, recents, entries, matching your saved products
  off.js           Open Food Facts barcode lookup and normalisation
  barcode.js       barcode decoding (BarcodeDetector or ZXing), loaded on demand
  scanpdf.js       body-scan PDF reading with pdf.js, loaded on demand
  scanparse.js     finding scan metrics in report text (pure, tested)
  health.js        Google Health API sign-in (code + PKCE) and sync
  health-map.js    Health API responses → day records (pure, tested)
  ai.js            AI functions; picks Claude-in-artifact or the API key provider
  ai-api.js        Anthropic SDK calls: structured outputs, web search + strict report tools
  store.js         persistence: Claude artifact database, or IndexedDB on the device; secrets kept apart
  env.js           which environment the app is running in
  data/            exercise library and the generated USDA food table
  media/ex/        exercise photos (start and finish frame)
  icons/           app icons
  ui/              screens and components
  styles.css       the whole design system, light and dark
  sw.template.js   offline support
scripts/
  build.mjs        builds the app (ES modules, code-split) and the artifact (one file)
  build-foods.mjs  regenerates app/data/foods.json from a USDA export
tests/             node:test suites
```

**Data model.** `profile` holds you, your goal, targets, program and app settings, and scans. `library` holds your foods (from labels, barcodes and lookups, with their barcode and source) and recipes. Each day is its own document, `days/YYYY-MM-DD`: food entries, weigh-in, waist, steps, sleep, resting heart rate, cardio, workouts. Synced fields carry a source (`stepsSrc`, `weightSrc`, `cardioSrc`) so manual entries always win. A food entry stores its calories and macros at the moment you log it, so later edits never rewrite history. Secrets (API key, Google tokens) live in a separate device-only store and are never exported.

**Common changes.**
- *Add an exercise:* add it to `app/data/exercises.js`, add its two photos to `app/media/ex/<id>-0.jpg` and `-1.jpg` (or set `img: false`), and list it in a slot in `app/program.js`. `npm test` checks the photos and video id exist.
- *Change the program:* the templates (`FB_A`, `UP_A`, …) and slots at the top of `app/program.js`.
- *Add an everyday food:* add a line to `scripts/foods/curated.mjs` with its USDA NDB number, then `npm run foods -- path/to/database.json`.
- *Tune the plan or the step credit:* `buildPlan`, `macrosFor` and `stepCredit` in `app/engine.js`, with tests beside them in `tests/engine.test.mjs`.
- *Sync another Fitbit metric:* add a mapper in `app/health-map.js`, a call in `syncHealth` in `app/health.js`, and the scope in `SCOPES` if it needs one.

## Credits

- Nutrition data: USDA National Nutrient Database for Standard Reference (public domain), via the snapshot published with *Python for Data Analysis*. Barcode data: [Open Food Facts](https://world.openfoodfacts.org) (ODbL).
- Exercise photos: [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (public domain / Unlicense).
- Form videos: YouTube tutorials by their creators, linked rather than copied.
- Fonts: Big Shoulders Display and Instrument Sans (Google Fonts, OFL).
