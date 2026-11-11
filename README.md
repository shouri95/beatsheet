# Plates

A personal nutrition and strength coach that runs in the browser. You log what you eat by weight, log your lifts set by set, weigh in most mornings, and once a week it checks your numbers and adjusts your targets.

It runs two ways from the same build:

- **As a Claude artifact.** Your data is saved privately to your Claude account and syncs across devices. Claude features are switched on: describe a meal, photograph a plate or a nutrition label, read a body-scan printout, and ask the coach questions.
- **As a plain web page** (GitHub Pages, any static host, or locally). Data stays in that browser's storage. The Claude features are hidden; everything else works the same.

## What it does

**Setup.** Sex, age, height and weight; optional body fat from a DEXA, InBody or smart-scale report, or from a tape measure (US Navy method). Then daily activity, training days, equipment, experience, a target weight and a timeframe. It suggests a target from your lean mass and tells you if the timeline isn't safe. It won't plan a loss faster than about 1% of body weight a week.

**Targets.**
- Resting burn uses Katch–McArdle when lean mass is known, Mifflin–St Jeor otherwise. Daily activity and lifting sessions are added on top.
- The deficit follows your timeline, capped at 25–30% of your daily burn and 0.5–1% of body weight per week depending on how lean you are. Calories never go below 1,500 for men or 1,200 for women.
- Protein is 2.2–2.4 g per kg of lean mass, or about 2 g per kg of body weight without a scan. Fat is at least 25% of calories. Carbs fill the rest.

**The self-correcting part.** Every week the check-in compares what you ate with how your trend weight moved. Eating minus change in stored energy gives your real daily burn. That estimate is blended with the formula by a confidence score based on how many days you logged and weighed in, so after 2–3 weeks your targets come from your own body, not from population averages.

**Food.** 6,440 foods from the USDA National Nutrient Database for Standard Reference, with 153 everyday items given friendly names and portion sizes. You can add your own foods from nutrition labels (or a photo of one, inside Claude) and build recipes with a cooked weight, so a weighed bowl is exact. The Today screen shows how much of the day's calories came from verified entries rather than estimates.

**Training.** The program depends on training days per week: full body for 2–3 days, upper/lower for 4, upper/lower plus push/pull/legs for 5, push/pull/legs twice for 6. Exercises are picked for your equipment (full gym, home gym, or bodyweight only) and experience. Progression is double progression: once you hit the top of the rep range on every set, the weight goes up and you start again at the bottom of the range. Every fifth week is a deload. Each exercise has an animated start/finish demo, form cues, the most common mistake, a tutorial video, swaps, and your history. Personal records are detected from estimated 1-rep max.

**Belly fat.** You can't reduce fat in one spot, and the app says so. It tracks waist measurements weekly and puts steps, easy cardio, protein and lifting in front of you every day, because those are what move it.

## Use it

Inside Claude, open the artifact link. Outside Claude:

```sh
npm install
npm run build        # writes dist/
npm run dev          # rebuilds on change and serves http://localhost:4173
npm test             # engine and program tests
```

Open `dist/index.html` through a server (the dev script, or `python3 -m http.server -d dist`), not as a `file://` URL, because the food table is fetched.

**GitHub Pages:** `.github/workflows/pages.yml` builds and deploys on every push to `main`. In the repository settings, set Pages → Source to "GitHub Actions" once.

**Backups:** Plan & settings → Export backup gives you a JSON file of everything; Import restores it. That is also how you move data between the Claude version and a standalone copy.

## Accuracy, honestly

No app can make food tracking 100% accurate, but you can get close:

1. **Weigh food in grams** on a kitchen scale, and pick the matching state: "cooked" and "uncooked" rice differ by nearly 3×.
2. **Use the label for packaged food.** Save it once and it's exact from then on.
3. **Weigh yourself most mornings.** The trend line, not any single weigh-in, drives the adjustments.
4. **Log every day, even roughly.** Gaps make the adaptive estimate wait.

Photo and description estimates (Claude) are marked as estimates and are typically within 20–30%. The formulas are typically within ±10% of your real burn until your own data takes over.

This is general fitness guidance, not medical advice.

## Code

No framework beyond [Preact](https://preactjs.com) and [htm](https://github.com/developit/htm). One bundle, built by esbuild.

```
app/
  engine.js        all the maths: body fat, burn, plan, trend, adaptive burn, 1RM (pure, tested)
  program.js       splits, exercise selection, progression, PRs (pure, tested)
  coach.js         weekly review notes, daily tips, AI context
  foods.js         search, recipes, recents, entries
  store.js         persistence: Claude artifact database or localStorage, with a write queue
  ai.js            Claude features (meal, photo, label, scan, chat), hidden outside Claude
  data/
    exercises.js   the exercise library: cues, mistakes, video ids, equipment, load type
    foods.json     generated USDA table (see below)
  media/ex/        exercise photos (start and finish frame)
  ui/              screens and components
  styles.css       the whole design system, light and dark
scripts/
  build.mjs        bundles app/ into dist/index.html and dist/artifact.html
  build-foods.mjs  regenerates app/data/foods.json from a USDA export
  foods/curated.mjs  the everyday foods, their friendly names and portions
tests/             node:test suites
```

**Data model.** Three kinds of documents. `profile` holds you, your goal, targets, program settings and scans. `library` holds your foods and recipes. Each day is its own document, `days/YYYY-MM-DD`, with food entries, weigh-in, waist, steps, cardio and the workout. A food entry stores its calories and macros at the moment you log it, so later database changes never rewrite history. Body weight is stored in kg and food in grams; units are converted only for display.

**Common changes.**
- *Add an exercise:* add it to `app/data/exercises.js`, add its two photos to `app/media/ex/<id>-0.jpg` and `-1.jpg` (or set `img: false`), and list it in a slot in `app/program.js`. `npm test` checks the photos and video id exist.
- *Change the program:* the templates (`FB_A`, `UP_A`, …) and slots at the top of `app/program.js`.
- *Add an everyday food:* add a line to `scripts/foods/curated.mjs` with its USDA NDB number, then `npm run foods -- path/to/database.json`.
- *Tune the plan:* the constants in `buildPlan` and `macrosFor` in `app/engine.js`, with tests beside them in `tests/engine.test.mjs`.

## Credits

- Nutrition data: USDA National Nutrient Database for Standard Reference (public domain), via the snapshot published with *Python for Data Analysis*.
- Exercise photos: [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (public domain / Unlicense).
- Form videos: YouTube tutorials by their creators, linked rather than copied.
- Fonts: Big Shoulders Display and Instrument Sans (Google Fonts, OFL).
