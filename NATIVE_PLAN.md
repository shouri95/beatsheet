# Plates for iPhone: native app plan

A handoff for building Plates as a native SwiftUI app on a Mac with Xcode. The web app in this repo (live at https://shouri95.github.io/beatsheet/) is the working specification. Don't redesign the web app; the native app *is* the redesign.

**To start a session on the Mac,** clone the repo, open Claude Code in it and say:

> Read NATIVE_PLAN.md. Build the native iPhone app milestone by milestone, starting with M0 and M1. Build and run after every step.

## Who it's for

One person, on an iPhone, in Australia. That shapes the defaults:

- Labels show energy in kJ.
- Carman's, Woolworths and Coles products are common.
- Fitbit tracks steps and sleep.
- Body scans come from an Evolt 360 (via the Evolt Active app).
- The goal is to lose belly fat and build lean muscle within a set timeframe.

What they asked for, in their words, summarised:

- **Minimal and beautiful; the web version feels cluttered.** This is the top priority.
- **A Home Screen widget** to log what they're eating.
- **Describing a meal in words must always be visible.** In the web app it hid itself when no API key was set; that read as "removed".
- **Exact numbers for branded food.** The original bug was Carman's "low carb" granola guessed at 7 g carbs per 40 g; the label says about 14 g.
- **Fitbit data used automatically.**
- **Body scan import.** The Evolt PDF, or waist only, or skip.

## What carries over from the web app (port, don't reinvent)

Pure logic with tests. Port each file to Swift and port its tests to XCTest or Swift Testing as the acceptance check:

| Web file | Swift target | What it is |
|---|---|---|
| `app/engine.js` | `Engine.swift` | Body fat (Navy, waist-to-height RFM), BMR (Katch–McArdle / Mifflin–St Jeor), plan and macros, safety caps, trend weight, adaptive burn, step credit, label checks, sleep stats, 1RM, plate maths |
| `app/program.js` | `Program.swift` | Splits for 2–6 days, exercise selection by equipment and level, swaps, double progression, deloads, PRs |
| `app/coach.js` | `Coach.swift` | Weekly review notes, daily tips, context for the AI coach |
| `app/scanparse.js` | `ScanParse.swift` | Finds scan metrics in report text (Evolt, InBody, DEXA) and cross-checks them |
| `app/health-map.js` | `HealthMap.swift` | Google Health API responses → day records; manual entries always win |
| `app/off.js` | `OpenFoodFacts.swift` | Barcode lookup and normalisation (kJ → kcal, label check) |
| `app/foods.js` | `FoodSearch.swift` | Search ranking, recents, recipes, matching your saved products |
| `tests/*.mjs` | `PlatesTests/` | 41 tests. All must pass before UI work on a feature. |

Data files to bundle as-is:

- `app/data/foods.json`: 6,440 USDA foods. Rows are `[key, name, groupIndex, kcal, p, c, f, fiber, portions, flags, words]`, per 100 g.
- `app/data/exercises.js`: 68 exercises with cues, common mistakes, YouTube ids and equipment needs. Convert it to JSON.
- `app/media/ex/*.jpg`: start and finish photos, 480 px. Ship them in the asset catalog.

Safety rules that must survive the port, because they're tested:

- Never below 1,500 kcal (men) or 1,200 kcal (women).
- Loss capped at 0.5–1% of body weight a week, depending on leanness.
- The deficit is capped at 25–30% of daily burn.
- No target below BMI 18.5; under-18s get maintenance only.
- Step credit: half of the extra burn above the median of the last 28 days, capped at 250 kcal, never negative.

## Architecture

- **SwiftUI, iOS 18 minimum.** Swift Charts, App Intents, WidgetKit, VisionKit, Vision, PDFKit.
- **Storage:** SwiftData in an App Group container so the widget can read today's numbers. iCloud sync (SwiftData + CloudKit) needs the paid Apple Developer Program, so start local-only and add CloudKit later.
- **Secrets** (Anthropic key, Google tokens) go in the Keychain, never in SwiftData.
- **Anthropic API:** there's no official Swift SDK, so use raw HTTP with `URLSession` against `POST https://api.anthropic.com/v1/messages`. Copy the request shapes from `app/ai-api.js`:
  - Model `claude-opus-5-5` by default.
  - Structured outputs via `output_config.format` for label, scan and meal JSON.
  - The `web_search_20260209` tool plus a strict `report_meal` / `report_product` tool for online label lookups. Handle the `pause_turn` stop reason.
  - Header `anthropic-beta: server-side-fallback-2026-07-01` with `"fallbacks": "default"` for refusals.
  - Read the claude-api skill before writing this code.
- **Google Health API (Fitbit):** the old Fitbit Web API was turned off on 2 November 2026.
  - Sign in with `ASWebAuthenticationSession` using an **iOS** OAuth client (PKCE, no client secret). The redirect is `com.googleusercontent.apps.<id>:/oauth2redirect`.
  - Scopes: `googlehealth.activity_and_fitness.readonly`, `googlehealth.sleep.readonly`, `googlehealth.health_metrics_and_measurements.readonly`.
  - The endpoints, filters and response shapes are already worked out in `app/health.js` and `app/health-map.js`.
  - The user creates their own Google Cloud project and adds themselves as a test user. In Testing mode Google signs them out every 7 days; publishing the project (unverified, under 100 users) stops that.
  - Optionally read iPhone step counts from HealthKit as a fallback.
- **Open Food Facts:** only barcode lookup works (`/api/v2/product/{code}.json`); its text search is down. Treat its data as crowd-sourced and run the label check on every product.
- **Importing from the web app:** support the Plates backup JSON: `{app:"plates", v:1, profile, library:{foods,recipes}, days:{YYYY-MM-DD:{...}}}`. The user has a backup file and will restore from it on first launch.

## Native advantages to use (no API key needed)

- **Barcodes:** `DataScannerViewController` (VisionKit) is faster and more reliable than the web's ZXing.
- **Nutrition labels:** Vision text recognition on a photo, then a deterministic panel parser (per 100 g column, kJ → kcal, AU/NZ and US layouts). Claude becomes optional for labels.
- **Evolt PDF:** PDFKit text → `ScanParse`. For image-only PDFs or screenshots, use Vision OCR → `ScanParse`. Ask the user for their real Evolt PDF to validate; the parser was only tested on synthetic Evolt-style files.
- **Dictation:** describing a meal works by voice through the keyboard mic for free.

## Design direction: calm, monochrome, numbers first

The web app has too many cards, pills, hints and buttons on one screen. The native app should feel like a well-made instrument: one thing per screen, everything else a tap away.

- **Colour.** Warm off-white background (light) and true black (dark, for OLED), ink text, greys for anything secondary. The only colour is one hue per macro: protein coral, carbs blue, fat amber. Use them only as 2 pt lines and dots, never as fills or text. Semantic green, amber and red are only for states.
- **Type.** SF Pro. Hero numbers in SF Pro Rounded, Heavy, `.monospacedDigit()`, 72–96 pt. Labels in footnote size, secondary colour, sentence case. No uppercase eyebrows everywhere.
- **Space, not boxes.** Separate with whitespace and hairlines. A card only for the one "do this now" item, such as the next workout or the weekly check-in. No more than one hint sentence on screen at a time.
- **Motion and touch.** Springy ring fill, numbers that count up, haptics on log / set done / PR. Respect Reduce Motion.
- **Tabs.** Today, Train, Progress, plus a floating log button. Coach lives inside Today (the weekly check-in appears when it's due); settings are a gear on Today.

Screens:

- **Today.**
  - Top: the date.
  - Hero: kcal left, large, with a thin ring.
  - Below: three thin macro lines with "45 / 140 g".
  - Then an always-visible text field, "What did you eat?", that opens the log sheet with the text already in it.
  - Meals as a plain list.
  - One compact body row: "67.0 kg · 8,412 steps · 7 h 02 sleep" (tap to expand).
  - The next workout as the one card.
- **Log sheet.**
  - Focused text field.
  - Below it, live matches from your foods and the USDA table, and "Estimate with Claude" when the text reads like a meal. Without an API key, this button explains how to add one; it never disappears.
  - One camera button that detects a barcode, a label or a plate.
  - Quick add and yesterday's meal as small secondary rows.
  - Branded items show "verified" or "estimate", with one-tap fixes.
- **Train.**
  - The plan, then a full-screen session with one exercise at a time and big set rows.
  - The rest timer as a Live Activity and Dynamic Island.
  - Exercise detail: the photo pair as a crossfade, three cues, the common mistake, and a video link.
- **Progress.** A single scroll: weight trend (Swift Charts, raw dots plus a trend line), waist, body composition from scans, strength (estimated 1RM). Add a scan here: Evolt PDF, photo, or type it in.
- **Onboarding.** Five quiet steps:
  1. You.
  2. Body fat: upload a scan, waist only, or skip.
  3. Your week.
  4. Goal and timeline, with the safe-pace explanation.
  5. Your plan.
- **Widgets.**
  - Small: kcal left ring.
  - Medium: kcal and protein left, plus a Log button. The button runs an App Intent that opens the log sheet.
  - Lock Screen: circular kcal left.
  - Control Center: a "Log food" control.
- **Siri / Shortcuts:** "Log food in Plates" takes a text parameter and opens the log sheet with it filled in.

## Milestones

Each one should build and run on the phone before the next starts.

| # | Milestone | Done when |
|---|---|---|
| M0 | Xcode project: app, widget extension, App Group, design tokens, empty tabs | Runs on the iPhone |
| M1 | Port the pure logic and data (table above) with tests | All 41 ported tests pass |
| M2 | SwiftData models and backup import | The user's backup restores and Today shows their breakfast |
| M3 | Onboarding, Today, the log sheet (search, describe, quick add, recents, yesterday's meal), Anthropic client | A full day can be logged |
| M4 | Camera: barcode → OFF, label OCR, meal photo, Evolt PDF and photo → scan | Carman's can be verified from its label; the Evolt PDF imports |
| M5 | Widgets, App Intents, Control | Logging from the Home Screen works |
| M6 | Train: plan, session, progression, rest Live Activity, exercise library | A workout can be completed and PRs show |
| M7 | Progress charts, weekly check-in, coach chat | The check-in updates targets |
| M8 | Google Health API sync (and optional HealthKit steps) | Steps and sleep arrive on their own |
| M9 | Polish: haptics, animations, Dynamic Type, VoiceOver, dark mode | Feels finished |

## Signing

- A **free Apple ID** installs on your own phone, but the app must be reinstalled from Xcode every 7 days.
- The **Apple Developer Program ($99/year)** removes that and adds TestFlight and iCloud sync.
- Widgets need an App Group; check Signing & Capabilities for what a free team allows.

## Keeping the token bill down

- Read only this file, then the one web file you're porting. Don't scan the whole repo.
- Let the compiler and tests find errors (`xcodebuild test`), not long reasoning.
- One milestone per session is a good size. Commit at the end of each.
- Don't port the web UI code (`app/ui/*`) line by line. Use it only to check behaviour.
