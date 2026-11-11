// Plates: the numbers. Ported from app/engine.js; tested in EngineTests.
// Pure functions only. All internal quantities are metric (kg, cm, kcal, g).
import Foundation

public enum Engine {
    public static let kcalPerKg = 7700.0      // energy in 1 kg of body-weight change (mostly fat)
    public static let kgPerLb = 0.45359237
    public static let kjPerKcal = 4.184

    // MARK: - Dates (local calendar days as "YYYY-MM-DD")
    //
    // Day arithmetic is done on civil dates (no time zones, no DST), which is
    // what the web app's noon-anchored Date maths amounts to.

    public static func dateKey(_ d: Date = Date(), calendar: Calendar = .current) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: d)
        return key(c.year ?? 2000, c.month ?? 1, c.day ?? 1)
    }

    public static func key(_ y: Int, _ m: Int, _ d: Int) -> String {
        String(format: "%04d-%02d-%02d", y, m, d)
    }

    public static func isDateKey(_ k: String) -> Bool {
        let p = k.split(separator: "-")
        return p.count == 3 && p[0].count == 4 && p[1].count == 2 && p[2].count == 2 && p.allSatisfy { Int($0) != nil }
    }

    /// (year, month, day) of a key. Malformed keys read as 2000-01-01.
    public static func parts(_ k: String) -> (y: Int, m: Int, d: Int) {
        let p = k.split(separator: "-").map { Int($0) ?? 1 }
        return (p.count > 0 ? p[0] : 2000, p.count > 1 ? p[1] : 1, p.count > 2 ? p[2] : 1)
    }

    /// Noon local time on that day (safe against DST edges).
    public static func parseKey(_ k: String, calendar: Calendar = .current) -> Date {
        let p = parts(k)
        return calendar.date(from: DateComponents(year: p.y, month: p.m, day: p.d, hour: 12)) ?? Date()
    }

    // Howard Hinnant's days-from-civil.
    static func dayNumber(_ k: String) -> Int {
        let p = parts(k)
        let y = p.m <= 2 ? p.y - 1 : p.y
        let era = (y >= 0 ? y : y - 399) / 400
        let yoe = y - era * 400
        let mp = (p.m + 9) % 12
        let doy = (153 * mp + 2) / 5 + p.d - 1
        let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
        return era * 146097 + doe - 719468
    }

    static func keyFromDayNumber(_ z0: Int) -> String {
        let z = z0 + 719468
        let era = (z >= 0 ? z : z - 146096) / 146097
        let doe = z - era * 146097
        let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365
        let doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
        let mp = (5 * doy + 2) / 153
        let d = doy - (153 * mp + 2) / 5 + 1
        let m = mp < 10 ? mp + 3 : mp - 9
        let y = yoe + era * 400 + (m <= 2 ? 1 : 0)
        return key(y, m, d)
    }

    public static func addDays(_ k: String, _ n: Int) -> String { keyFromDayNumber(dayNumber(k) + n) }
    public static func diffDays(_ a: String, _ b: String) -> Int { dayNumber(b) - dayNumber(a) }
    /// 0 = Monday … 6 = Sunday.
    public static func weekdayMondayFirst(_ k: String) -> Int { ((dayNumber(k) % 7) + 7 + 3) % 7 }

    // MARK: - Small helpers

    public static func clamp(_ x: Double, _ lo: Double, _ hi: Double) -> Double { min(hi, max(lo, x)) }
    /// JavaScript Math.round semantics (halves round up, toward +∞).
    public static func jsRound(_ x: Double) -> Double { (x + 0.5).rounded(.down) }
    public static func roundTo(_ x: Double, _ step: Double) -> Double { jsRound(x / step) * step }
    static func clamp01(_ x: Double) -> Double { clamp(x, 0, 1) }
    public static func bmi(_ kg: Double, _ cm: Double) -> Double { kg / pow(cm / 100, 2) }
    public static func kgAtBmi(_ b: Double, _ cm: Double) -> Double { b * pow(cm / 100, 2) }

    // MARK: - Body composition

    /// US Navy circumference method. Good to roughly ±3–4 % body fat.
    public static func navyBodyFat(sex: Sex, heightCm: Double, neckCm: Double, waistCm: Double, hipCm: Double? = nil) -> Double? {
        let bf: Double
        if sex == .f {
            guard let hip = hipCm, hip > 0 else { return nil }
            let x = waistCm + hip - neckCm
            guard x > 0 else { return nil }
            bf = 495 / (1.29579 - 0.35004 * log10(x) + 0.221 * log10(heightCm)) - 450
        } else {
            let x = waistCm - neckCm
            guard x > 0 else { return nil }
            bf = 495 / (1.0324 - 0.19077 * log10(x) + 0.15456 * log10(heightCm)) - 450
        }
        return bf.isFinite ? clamp(bf, 3, 60) : nil
    }

    /// Relative fat mass (Woolcott & Bergman, 2018): body fat % from height and waist.
    public static func rfmBodyFat(sex: Sex, heightCm: Double, waistCm: Double) -> Double? {
        guard heightCm > 0, waistCm > 0 else { return nil }
        let bf = (sex == .f ? 76.0 : 64.0) - 20 * (heightCm / waistCm)
        return bf.isFinite ? clamp(bf, 3, 60) : nil
    }

    public struct BodyComp: Sendable, Equatable {
        public var leanKg: Double
        public var bf: Double
        public var scan: Scan
    }

    /// Latest measurement that carries a body-fat figure → lean mass, held
    /// constant to estimate today's body fat at today's weight.
    public static func bodyComp(scans: [Scan], weightKg: Double) -> BodyComp? {
        let valid = scans.filter { ($0.bf ?? 0) > 0 || ($0.leanKg ?? 0) > 0 }
        guard !valid.isEmpty else { return nil }
        // Newest first; on the same day a real scan beats a tape estimate.
        let rank: (Scan) -> Int = { $0.isTape ? 1 : 0 }
        let s = valid.sorted { a, b in a.date == b.date ? rank(a) < rank(b) : a.date > b.date }[0]
        let scanW = (s.weightKg ?? 0) > 0 ? s.weightKg! : weightKg
        let leanKg = (s.leanKg ?? 0) > 0 ? s.leanKg! : scanW * (1 - (s.bf ?? 0) / 100)
        guard leanKg > 20, leanKg < weightKg else { return nil }
        return BodyComp(leanKg: leanKg, bf: (1 - leanKg / weightKg) * 100, scan: s)
    }
    public static func bodyComp(_ profile: Profile, _ weightKg: Double) -> BodyComp? { bodyComp(scans: profile.scans, weightKg: weightKg) }

    public static func ageOf(_ profile: Profile, year: Int = Calendar.current.component(.year, from: Date())) -> Double {
        clamp(Double(year - (profile.birthYear ?? year - 30)), 13, 100)
    }

    // MARK: - Energy expenditure

    /// Katch–McArdle when lean mass is known; Mifflin–St Jeor otherwise.
    public static func bmrOf(_ profile: Profile, _ weightKg: Double, year: Int? = nil) -> (bmr: Double, method: String) {
        if let comp = bodyComp(profile, weightKg) { return (370 + 21.6 * comp.leanKg, "katch") }
        let s: Double = profile.sex == .f ? -161 : 5
        let age = year.map { ageOf(profile, year: $0) } ?? ageOf(profile)
        return (10 * weightKg + 6.25 * profile.heightCm - 5 * age + s, "mifflin")
    }

    public struct ActivityLevel: Sendable, Identifiable {
        public let id: Int
        public let label: String
        public let hint: String
        public let f: Double
    }

    /// Daily life outside the gym. Training is added separately.
    public static let activity: [ActivityLevel] = [
        .init(id: 1, label: "Mostly sitting", hint: "Desk job, under 5,000 steps a day", f: 1.2),
        .init(id: 2, label: "Lightly active", hint: "Some walking, 5,000–8,000 steps", f: 1.35),
        .init(id: 3, label: "Active", hint: "On your feet a lot, 8,000–12,000 steps", f: 1.5),
        .init(id: 4, label: "Very active", hint: "Physical job or 12,000+ steps", f: 1.7),
    ]

    public static func formulaTdee(_ profile: Profile, _ weightKg: Double, year: Int? = nil) -> (bmr: Double, method: String, tdee: Double) {
        let b = bmrOf(profile, weightKg, year: year)
        let f = (activity.first { $0.id == profile.activity } ?? activity[1]).f
        let sessions = Double(profile.train.days)
        let training = (sessions * 2.5 * weightKg) / 7   // ~2.5 kcal/kg net for an hour of lifting
        return (b.bmr, b.method, b.bmr * f + training)
    }

    // MARK: - The plan

    public static func kcalFloor(_ sex: Sex) -> Double { sex == .f ? 1200 : 1500 }

    static func leanTier(_ profile: Profile, _ weightKg: Double) -> String {
        let f = profile.sex == .f
        if let comp = bodyComp(profile, weightKg) {
            if comp.bf >= (f ? 32 : 22) { return "high" }
            if comp.bf < (f ? 24 : 15) { return "lean" }
            return "mid"
        }
        let b = bmi(weightKg, profile.heightCm)
        return b >= 28 ? "high" : b < 23 ? "lean" : "mid"
    }

    public struct Macros: Sendable, Equatable { public var p, c, f, fiber: Double }

    public static func macrosFor(kcal: Double, weightKg: Double, profile: Profile, mode: String) -> Macros {
        let comp = bodyComp(profile, weightKg)
        let ref = min(weightKg, kgAtBmi(27, profile.heightCm))
        var p = comp.map { $0.leanKg * (mode == "cut" ? 2.4 : 2.2) } ?? ref * (mode == "cut" ? 2.0 : 1.8)
        p = clamp(p, 1.2 * ref, 2.6 * ref)
        p = min(p, (kcal * 0.4) / 4)
        p = roundTo(p, 5)
        var f = roundTo(max((kcal * 0.25) / 9, 0.6 * ref), 5)
        var c = (kcal - 4 * p - 9 * f) / 4
        if c < 60 { f = roundTo(max(0.5 * ref, 35), 5); c = (kcal - 4 * p - 9 * f) / 4 }
        c = max(0, roundTo(c, 5))
        return Macros(p: p, c: c, f: f, fiber: max(25, roundTo((kcal / 1000) * 14, 1)))
    }

    public struct Plan: Sendable, Equatable {
        public var mode: String            // cut | gain | recomp | maintain
        public var tier: String
        public var bmr: Double
        public var bmrMethod: String
        public var tdee: Double
        public var formulaTdee: Double
        public var kcal: Double
        public var p: Double
        public var c: Double
        public var f: Double
        public var fiber: Double
        public var deficit: Double
        public var rateKgWk: Double
        public var ratePct: Double
        public var requestedKgWk: Double
        public var capped: String?         // rate | deficit | floor
        public var targetKg: Double
        public var weeksLeft: Double
        public var endDate: String
        public var etaWeeks: Double?
        public var etaDate: String?
        public var reachByEnd: Double
        public var notes: [String]
    }

    /// profile.goal = { targetKg, weeks, startDate, startKg }.
    /// `tdee` overrides the formula (used once the adaptive estimate has data).
    public static func buildPlan(_ profile: Profile, _ weightKg: Double, today: String = dateKey(), tdee override: Double? = nil) -> Plan {
        let g = profile.goal
        let year = parts(today).y
        let ft = formulaTdee(profile, weightKg, year: year)
        let tdee = (override ?? 0) > 0 ? override! : ft.tdee
        let sex = profile.sex
        var notes: [String] = []

        let endDate = addDays(g.startDate ?? today, Int(jsRound((g.weeks ?? 12) * 7)))
        let weeksLeft = max(1, Double(diffDays(today, endDate)) / 7)

        var targetKg = (g.targetKg ?? 0) > 0 ? g.targetKg! : weightKg
        let minHealthy = kgAtBmi(18.5, profile.heightCm)
        if targetKg < minHealthy { targetKg = minHealthy; notes.append("target_low") }

        let delta = targetKg - weightKg
        var mode = delta < -0.75 ? "cut" : delta > 0.75 ? "gain" : "recomp"
        if ageOf(profile, year: year) < 18 { mode = "maintain"; notes.append("minor") }

        let tier = leanTier(profile, weightKg)
        var kcal = tdee
        var requested = 0.0
        var capped: String? = nil

        if mode == "cut" {
            requested = delta / weeksLeft
            let maxPct = tier == "high" ? 0.01 : tier == "lean" ? 0.005 : 0.008
            let rate = min(-requested, maxPct * weightKg)
            if rate < -requested - 1e-6 { capped = "rate" }
            var deficit = (rate * kcalPerKg) / 7
            let maxDeficit = tdee * (tier == "high" ? 0.3 : 0.25)
            if deficit > maxDeficit { deficit = maxDeficit; capped = "deficit" }
            kcal = tdee - deficit
            if kcal < kcalFloor(sex) { kcal = kcalFloor(sex); capped = "floor" }
        } else if mode == "gain" {
            requested = delta / weeksLeft
            let maxPct = profile.train.level == "new" ? 0.005 : 0.003
            let rate = min(requested, maxPct * weightKg)
            if rate < requested - 1e-6 { capped = "rate" }
            kcal = tdee + clamp((rate * kcalPerKg) / 7, 150, tdee * 0.15)
        } else if mode == "recomp" {
            kcal = tdee - min(tdee * 0.1, 300)
        }

        kcal = roundTo(kcal, 10)
        let rateKgWk = ((kcal - tdee) * 7) / kcalPerKg
        let etaWeeks: Double? = (mode == "cut" || mode == "gain") && abs(rateKgWk) > 0.02 ? delta / rateKgWk : nil
        let reachByEnd = weightKg + rateKgWk * weeksLeft
        let m = macrosFor(kcal: kcal, weightKg: weightKg, profile: profile, mode: mode)

        return Plan(
            mode: mode, tier: tier, bmr: ft.bmr, bmrMethod: ft.method, tdee: tdee, formulaTdee: ft.tdee,
            kcal: kcal, p: m.p, c: m.c, f: m.f, fiber: m.fiber,
            deficit: tdee - kcal, rateKgWk: rateKgWk, ratePct: (rateKgWk / weightKg) * 100,
            requestedKgWk: requested, capped: capped, targetKg: targetKg, weeksLeft: weeksLeft, endDate: endDate,
            etaWeeks: etaWeeks, etaDate: etaWeeks.map { addDays(today, Int(jsRound($0 * 7))) },
            reachByEnd: mode == "cut" ? max(reachByEnd, targetKg) : mode == "gain" ? min(reachByEnd, targetKg) : weightKg,
            notes: notes
        )
    }

    public struct TargetSuggestion: Sendable, Equatable {
        public var targetKg: Double
        public var why: String        // bf | lean | bmi
        public var goalBf: Double?
    }

    /// A sensible first target for "lose the belly, add muscle".
    public static func suggestTarget(_ profile: Profile, _ weightKg: Double) -> TargetSuggestion {
        let f = profile.sex == .f
        if let comp = bodyComp(profile, weightKg) {
            let goalBf = f ? 24.0 : 15.0
            if comp.bf > goalBf + 1 {
                return .init(targetKg: roundTo((comp.leanKg + 0.5) / (1 - goalBf / 100), 0.5), why: "bf", goalBf: goalBf)
            }
            return .init(targetKg: roundTo(weightKg, 0.5), why: "lean", goalBf: nil)
        }
        let b = bmi(weightKg, profile.heightCm)
        if b > 25 { return .init(targetKg: roundTo(max(kgAtBmi(24, profile.heightCm), weightKg * 0.85), 0.5), why: "bmi", goalBf: nil) }
        return .init(targetKg: roundTo(weightKg, 0.5), why: "lean", goalBf: nil)
    }

    // MARK: - Food totals

    public struct Totals: Sendable, Equatable {
        public var k = 0.0, p = 0.0, c = 0.0, f = 0.0, fb = 0.0
        public var n = 0
        public var verifiedK = 0.0
        public init() {}
    }

    public static func dayTotals(_ day: Day?) -> Totals {
        var t = Totals()
        for e in day?.foods ?? [] {
            t.k += e.k; t.p += e.p; t.c += e.c; t.f += e.f; t.fb += e.fb; t.n += 1
            if !e.est { t.verifiedK += e.k }
        }
        return t
    }

    public struct DayScore: Sendable, Equatable { public var kr, pr: Double; public var kcalOk, proteinOk, onTarget: Bool }

    /// "On target": calories within a sensible band and protein mostly there.
    public static func dayScore(_ totals: Totals, kcal: Double, p: Double) -> DayScore? {
        guard totals.n > 0, kcal > 0, p > 0 else { return nil }
        let kr = totals.k / kcal, pr = totals.p / p
        let kOk = kr >= 0.85 && kr <= 1.07, pOk = pr >= 0.9
        return DayScore(kr: kr, pr: pr, kcalOk: kOk, proteinOk: pOk, onTarget: kOk && pOk)
    }

    public static func streak(_ days: Days, today: String = dateKey()) -> Int {
        let logged: (String) -> Bool = { !(days[$0]?.foods.isEmpty ?? true) }
        var k = logged(today) ? today : addDays(today, -1)
        var n = 0
        while logged(k) { n += 1; k = addDays(k, -1) }
        return n
    }

    // MARK: - Weight trend

    public struct WeightPoint: Sendable, Equatable, Identifiable {
        public var date: String
        public var w: Double
        public var t: Double
        public var id: String { date }
        public init(date: String, w: Double, t: Double? = nil) { self.date = date; self.w = w; self.t = t ?? w }
    }

    public static func weightSeries(_ days: Days) -> [WeightPoint] {
        days.compactMap { k, d in (d.weight ?? 0) > 0 ? WeightPoint(date: k, w: d.weight!) : nil }.sorted { $0.date < $1.date }
    }

    /// Exponentially weighted trend, gap-aware.
    public static func withTrend(_ series: [WeightPoint], alphaPerDay: Double = 0.16) -> [WeightPoint] {
        var t: Double? = nil
        var prev: String? = nil
        return series.map { pt in
            if let cur = t, let p = prev {
                let gap = Double(max(1, diffDays(p, pt.date)))
                t = cur + (1 - pow(1 - alphaPerDay, gap)) * (pt.w - cur)
            } else { t = pt.w }
            prev = pt.date
            return WeightPoint(date: pt.date, w: pt.w, t: t)
        }
    }

    public struct Slope: Sendable, Equatable { public var slope: Double; public var n: Int; public var span: Int }

    /// Least-squares slope of raw weigh-ins in [from, to], in kg/day.
    public static func weightSlope(_ series: [WeightPoint], from: String, to: String, minPoints: Int = 5, minSpan: Int = 7) -> Slope? {
        let pts = series.filter { $0.date >= from && $0.date <= to }
        guard pts.count >= minPoints else { return nil }
        let x0 = pts[0].date
        let span = diffDays(x0, pts[pts.count - 1].date)
        guard span >= minSpan else { return nil }
        let xs = pts.map { Double(diffDays(x0, $0.date)) }
        let mx = xs.reduce(0, +) / Double(xs.count)
        let my = pts.reduce(0) { $0 + $1.w } / Double(pts.count)
        var sxy = 0.0, sxx = 0.0
        for (i, x) in xs.enumerated() { sxy += (x - mx) * (pts[i].w - my); sxx += (x - mx) * (x - mx) }
        return sxx != 0 ? Slope(slope: sxy / sxx, n: pts.count, span: span) : nil
    }

    // MARK: - Adaptive expenditure
    // What you ate, minus what your weight did, is what you burned.

    public struct Adaptive: Sendable, Equatable {
        public var tdee, avgIntake, slopeKgWk: Double
        public var loggedDays, weighIns, spanDays: Int
        public var coverage, confidence: Double
        public var from: String
    }

    public static func adaptiveTdee(days: Days, today: String = dateKey(), bmr: Double?, planStart: String?, windowDays: Int = 28) -> Adaptive? {
        var from = addDays(today, -(windowDays - 1))
        // The first days of a new diet shed water and glycogen, not tissue.
        if let ps = planStart, ps > addDays(from, -6) {
            let skipTo = addDays(ps, 5)
            if diffDays(skipTo, today) >= 13 { from = skipTo > from ? skipTo : from }
            else if ps > from { from = ps }
        }
        let yesterday = addDays(today, -1)
        let series = weightSeries(days)
        guard let fit = weightSlope(series, from: from, to: today, minPoints: 6, minSpan: 12) else { return nil }

        let minK = max(700, 0.55 * (bmr ?? 1500))
        var sum = 0.0, n = 0
        let spanDays = diffDays(from, yesterday) + 1
        var k = from
        while k <= yesterday {
            let t = dayTotals(days[k])
            if t.k >= minK { sum += t.k; n += 1 }
            k = addDays(k, 1)
        }
        let coverage = Double(n) / Double(max(1, spanDays))
        guard n >= 10, coverage >= 0.6 else { return nil }

        let avgIntake = sum / Double(n)
        var tdee = avgIntake - fit.slope * kcalPerKg
        if let b = bmr, b > 0 { tdee = clamp(tdee, b * 0.95, b * 2.6) }
        let confidence = 0.85 * (0.5 * clamp01(Double(fit.span - 12) / 14) + 0.25 * clamp01((coverage - 0.6) / 0.35) + 0.25 * clamp01(Double(fit.n - 6) / 10))
        return Adaptive(tdee: tdee, avgIntake: avgIntake, slopeKgWk: fit.slope * 7, loggedDays: n, weighIns: fit.n,
                        spanDays: spanDays, coverage: coverage, confidence: confidence, from: from)
    }

    public static func blendTdee(_ formula: Double, _ adaptive: Adaptive?) -> (tdee: Double, source: String, confidence: Double) {
        guard let a = adaptive else { return (formula, "formula", 0) }
        let c = a.confidence
        return (formula * (1 - c) + a.tdee * c, c > 0.25 ? "adaptive" : "formula", c)
    }

    // MARK: - Strength

    /// Epley estimate; meaningless past ~12 reps, so those sets are ignored.
    public static func e1rm(_ w: Double, _ reps: Double) -> Double {
        w > 0 && reps > 0 && reps <= 12 ? w * (1 + reps / 30) : 0
    }

    /// Plates per side for a barbell load, largest first.
    public static func plateLoad(total: Double, bar: Double, plates: [Double]) -> (perSide: [Double], leftover: Double)? {
        var side = (total - bar) / 2
        guard side >= -1e-9 else { return nil }
        var out: [Double] = []
        for p in plates { while side >= p - 1e-9 { out.append(p); side -= p } }
        return (out, max(0, side))
    }

    // MARK: - Steps → calories

    /// Net walking energy ≈ 0.5 kcal per kg per km; step ≈ 0.414 × height.
    public static func kcalPerStep(weightKg: Double, heightCm: Double) -> Double {
        0.5 * weightKg * ((0.414 * heightCm) / 100) / 1000
    }

    /// Your usual daily steps: the median of recent synced days (today excluded).
    public static func stepBaseline(_ days: Days, today: String, fallback: Double = 8000, lookback: Int = 28) -> (steps: Double, from: String, n: Int) {
        var vals: [Double] = []
        for i in 1...max(1, lookback) {
            if let s = days[addDays(today, -i)]?.steps, s > 0 { vals.append(s) }
        }
        if vals.count < 7 { return (fallback, "goal", vals.count) }
        vals.sort()
        let m = vals.count >> 1
        return (vals.count % 2 == 1 ? vals[m] : (vals[m - 1] + vals[m]) / 2, "history", vals.count)
    }

    /// Calories earned by walking more than usual: half the extra burn above
    /// the baseline, capped, never negative.
    public static func stepCredit(steps: Double?, baseline: Double, weightKg: Double, heightCm: Double, share: Double = 0.5, cap: Double = 250) -> (kcal: Double, extra: Double) {
        guard let steps, steps > 0, baseline > 0 else { return (0, 0) }
        let extra = max(0, steps - baseline)
        let kcal = min(cap, extra * kcalPerStep(weightKg: weightKg, heightCm: heightCm) * share)
        return (roundTo(kcal, 5), jsRound(extra))
    }

    // MARK: - Label sanity

    public static func kjToKcal(_ kj: Double) -> Double { kj / kjPerKcal }

    public enum LabelCheck: Sendable, Equatable {
        case ok
        case missing
        case impossible
        case mismatch(fromMacros: Double)
        public var ok: Bool { self == .ok }
        public var reason: String? {
            switch self { case .ok: nil; case .missing: "missing"; case .impossible: "impossible"; case .mismatch: "mismatch" }
        }
    }

    /// Does a label's calorie figure agree with its macros? Fibre counts
    /// 2 kcal/g; labels that exclude it from carbs and those that include it both pass.
    public static func labelCheck(kcal: Double?, p: Double = 0, c: Double = 0, f: Double = 0, fb: Double = 0) -> LabelCheck {
        guard let kcal, kcal >= 0 else { return .missing }
        if p + c + f > 100.5 || kcal > 902 { return .impossible }
        let lo = 4 * p + 4 * max(0, c - fb) + 9 * f
        let hi = 4 * p + 4 * c + 9 * f + 2 * fb
        let slack = max(25, 0.12 * max(kcal, hi))
        if kcal < lo - slack || kcal > hi + slack { return .mismatch(fromMacros: jsRound((lo + hi) / 2)) }
        return .ok
    }

    // MARK: - Sleep

    public static func sleepStats(_ days: Days, today: String, n: Int = 7) -> (avg: Double, nights: Int)? {
        var sum = 0.0, cnt = 0
        for i in 0..<n {
            if let a = days[addDays(today, -i)]?.sleep?.asleep, a > 0 { sum += a; cnt += 1 }
        }
        return cnt > 0 ? (sum / Double(cnt), cnt) : nil
    }
}
