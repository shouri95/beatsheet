// The data model. It mirrors the web app's documents one to one so a Plates
// backup ({app:"plates", v:1, profile, library, days}) decodes without a
// migration step:
//   profile  — you, your goal, your targets, your program settings
//   library  — your own foods (labels, barcodes, lookups) and recipes
//   days     — one record per local calendar day, keyed "YYYY-MM-DD"
//
// Every field decodes leniently (missing → default, number or string where
// the web app was loose) because backups come from older app versions.
import Foundation

// MARK: - Lenient decoding helpers

extension KeyedDecodingContainer {
    func lenientDouble(_ key: Key) -> Double? {
        if let v = try? decodeIfPresent(Double.self, forKey: key) { return v }
        if let s = try? decodeIfPresent(String.self, forKey: key) { return Double(s) }
        if let b = try? decodeIfPresent(Bool.self, forKey: key) { return b ? 1 : 0 }
        return nil
    }
    func lenientInt(_ key: Key) -> Int? {
        if let v = try? decodeIfPresent(Int.self, forKey: key) { return v }
        if let d = lenientDouble(key), d.isFinite { return Int(d.rounded()) }
        return nil
    }
    func lenientString(_ key: Key) -> String? {
        if let s = try? decodeIfPresent(String.self, forKey: key) { return s }
        if let d = try? decodeIfPresent(Double.self, forKey: key) {
            return d == d.rounded() ? String(Int(d)) : String(d)
        }
        return nil
    }
    func lenientBool(_ key: Key) -> Bool? {
        if let b = try? decodeIfPresent(Bool.self, forKey: key) { return b }
        if let d = try? decodeIfPresent(Double.self, forKey: key) { return d != 0 }
        return nil
    }
    func lenient<T: Decodable>(_ type: T.Type, _ key: Key) -> T? {
        (try? decodeIfPresent(T.self, forKey: key)) ?? nil
    }
}

public enum Sex: String, Codable, Sendable, CaseIterable { case m, f }

public enum Meal: String, Codable, Sendable, CaseIterable, Identifiable {
    case b, l, d, s
    public var id: String { rawValue }
    public var name: String {
        switch self { case .b: "Breakfast"; case .l: "Lunch"; case .d: "Dinner"; case .s: "Snacks" }
    }
    /// The meal that fits the current hour.
    public static func now(hour: Int = Calendar.current.component(.hour, from: Date())) -> Meal {
        hour < 11 ? .b : hour < 16 ? .l : hour < 21 ? .d : .s
    }
}

// MARK: - Profile

public struct Units: Codable, Sendable, Equatable {
    public var w: String = "kg"   // kg | lb
    public var h: String = "cm"   // cm | in
    public init(w: String = "kg", h: String = "cm") { self.w = w; self.h = h }
    public var imperial: Bool { w == "lb" }
}

public struct TrainSettings: Codable, Sendable, Equatable {
    public var days: Int = 3
    public var equipment: String = "gym"   // gym | home | bw
    public var level: String = "new"       // new | mid | exp
    public var swaps: [String: String] = [:]
    public init(days: Int = 3, equipment: String = "gym", level: String = "new", swaps: [String: String] = [:]) {
        self.days = days; self.equipment = equipment; self.level = level; self.swaps = swaps
    }
    enum CodingKeys: String, CodingKey { case days, equipment, level, swaps }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        days = c.lenientInt(.days) ?? 3
        equipment = c.lenientString(.equipment) ?? "gym"
        level = c.lenientString(.level) ?? "new"
        swaps = c.lenient([String: String].self, .swaps) ?? [:]
    }
}

/// A body-composition measurement: a real scan (Evolt, InBody, DEXA) or a
/// tape estimate (`src` "navy" or "rfm").
public struct Scan: Codable, Sendable, Equatable, Identifiable {
    public var date: String
    public var bf: Double?
    public var leanKg: Double?
    public var weightKg: Double?
    public var fatKg: Double?
    public var smmKg: Double?
    public var visceral: Double?
    public var bmr: Double?
    public var tbwKg: Double?
    public var src: String?
    public var device: String?
    public var id: String { "\(date)|\(src ?? "")|\(bf ?? 0)|\(leanKg ?? 0)" }
    public var isTape: Bool { src == "navy" || src == "rfm" }

    public init(date: String, bf: Double? = nil, leanKg: Double? = nil, weightKg: Double? = nil, fatKg: Double? = nil,
                smmKg: Double? = nil, visceral: Double? = nil, bmr: Double? = nil, tbwKg: Double? = nil,
                src: String? = nil, device: String? = nil) {
        self.date = date; self.bf = bf; self.leanKg = leanKg; self.weightKg = weightKg; self.fatKg = fatKg
        self.smmKg = smmKg; self.visceral = visceral; self.bmr = bmr; self.tbwKg = tbwKg; self.src = src; self.device = device
    }
    enum CodingKeys: String, CodingKey { case date, bf, leanKg, weightKg, fatKg, smmKg, visceral, bmr, tbwKg, src, device }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        date = c.lenientString(.date) ?? ""
        bf = c.lenientDouble(.bf); leanKg = c.lenientDouble(.leanKg); weightKg = c.lenientDouble(.weightKg)
        fatKg = c.lenientDouble(.fatKg); smmKg = c.lenientDouble(.smmKg); visceral = c.lenientDouble(.visceral)
        bmr = c.lenientDouble(.bmr); tbwKg = c.lenientDouble(.tbwKg)
        src = c.lenientString(.src); device = c.lenientString(.device)
    }
}

public struct Goal: Codable, Sendable, Equatable {
    public var targetKg: Double?
    public var weeks: Double?
    public var startDate: String?
    public var startKg: Double?
    public init(targetKg: Double? = nil, weeks: Double? = nil, startDate: String? = nil, startKg: Double? = nil) {
        self.targetKg = targetKg; self.weeks = weeks; self.startDate = startDate; self.startKg = startKg
    }
    enum CodingKeys: String, CodingKey { case targetKg, weeks, startDate, startKg }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        targetKg = c.lenientDouble(.targetKg); weeks = c.lenientDouble(.weeks)
        startDate = c.lenientString(.startDate); startKg = c.lenientDouble(.startKg)
    }
}

/// Today's daily targets, written by onboarding and the weekly check-in.
public struct Targets: Codable, Sendable, Equatable {
    public var kcal: Double = 2000
    public var p: Double = 140
    public var c: Double = 200
    public var f: Double = 65
    public var fiber: Double = 28
    public var steps: Double = 8000
    public var tdee: Double = 2300
    public var mode: String = "recomp"
    public var set: String?
    public var source: String?
    public init(kcal: Double = 2000, p: Double = 140, c: Double = 200, f: Double = 65, fiber: Double = 28,
                steps: Double = 8000, tdee: Double = 2300, mode: String = "recomp", set: String? = nil, source: String? = nil) {
        self.kcal = kcal; self.p = p; self.c = c; self.f = f; self.fiber = fiber
        self.steps = steps; self.tdee = tdee; self.mode = mode; self.set = set; self.source = source
    }
    enum CodingKeys: String, CodingKey { case kcal, p, c, f, fiber, steps, tdee, mode, set, source }
    public init(from decoder: Decoder) throws {
        let c0 = try decoder.container(keyedBy: CodingKeys.self)
        kcal = c0.lenientDouble(.kcal) ?? 2000; p = c0.lenientDouble(.p) ?? 140
        c = c0.lenientDouble(.c) ?? 200; f = c0.lenientDouble(.f) ?? 65
        fiber = c0.lenientDouble(.fiber) ?? 28; steps = c0.lenientDouble(.steps) ?? 8000
        tdee = c0.lenientDouble(.tdee) ?? 2300; mode = c0.lenientString(.mode) ?? "recomp"
        set = c0.lenientString(.set); source = c0.lenientString(.source)
    }
}

public struct CoachState: Codable, Sendable, Equatable {
    public var lastCheckin: String?
    public init(lastCheckin: String? = nil) { self.lastCheckin = lastCheckin }
}

public struct Prefs: Codable, Sendable, Equatable {
    public var launchLog: Bool?
    public var stepCredit: Bool?
    public var energyUnit: String?     // "kcal" | "kj" (native addition; labels in AU show kJ)
    public init(launchLog: Bool? = nil, stepCredit: Bool? = nil, energyUnit: String? = nil) {
        self.launchLog = launchLog; self.stepCredit = stepCredit; self.energyUnit = energyUnit
    }
    enum CodingKeys: String, CodingKey { case launchLog, stepCredit, energyUnit }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        launchLog = c.lenientBool(.launchLog); stepCredit = c.lenientBool(.stepCredit); energyUnit = c.lenientString(.energyUnit)
    }
}

public struct Profile: Codable, Sendable, Equatable {
    public var v: Int = 1
    public var sex: Sex = .m
    public var birthYear: Int?
    public var heightCm: Double = 175
    public var weightKg: Double?
    public var activity: Int = 2
    public var units: Units = Units()
    public var train: TrainSettings = TrainSettings()
    public var scans: [Scan] = []
    public var goal: Goal = Goal()
    public var targets: Targets?
    public var coach: CoachState = CoachState()
    public var prefs: Prefs = Prefs()
    public var created: Double?
    public var updated: Double?

    public init(sex: Sex = .m, birthYear: Int? = nil, heightCm: Double = 175, weightKg: Double? = nil, activity: Int = 2,
                units: Units = Units(), train: TrainSettings = TrainSettings(), scans: [Scan] = [], goal: Goal = Goal(),
                targets: Targets? = nil, coach: CoachState = CoachState(), prefs: Prefs = Prefs()) {
        self.sex = sex; self.birthYear = birthYear; self.heightCm = heightCm; self.weightKg = weightKg
        self.activity = activity; self.units = units; self.train = train; self.scans = scans; self.goal = goal
        self.targets = targets; self.coach = coach; self.prefs = prefs
    }
    enum CodingKeys: String, CodingKey { case v, sex, birthYear, heightCm, weightKg, activity, units, train, scans, goal, targets, coach, prefs, created, updated }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        v = c.lenientInt(.v) ?? 1
        sex = Sex(rawValue: c.lenientString(.sex) ?? "m") ?? .m
        birthYear = c.lenientInt(.birthYear)
        heightCm = c.lenientDouble(.heightCm) ?? 175
        weightKg = c.lenientDouble(.weightKg)
        activity = c.lenientInt(.activity) ?? 2
        units = c.lenient(Units.self, .units) ?? Units()
        train = c.lenient(TrainSettings.self, .train) ?? TrainSettings()
        scans = c.lenient([Scan].self, .scans) ?? []
        goal = c.lenient(Goal.self, .goal) ?? Goal()
        targets = c.lenient(Targets.self, .targets)
        coach = c.lenient(CoachState.self, .coach) ?? CoachState()
        prefs = c.lenient(Prefs.self, .prefs) ?? Prefs()
        created = c.lenientDouble(.created); updated = c.lenientDouble(.updated)
    }
}

// MARK: - Food

/// A logged item. Macros are stored as eaten (already scaled to `g`), so later
/// edits to a saved food never rewrite history.
public struct FoodEntry: Codable, Sendable, Equatable, Identifiable {
    public var id: String
    public var fid: String?        // key of the food it came from
    public var name: String
    public var brand: String?
    public var product: String?
    public var g: Double
    public var k: Double
    public var p: Double
    public var c: Double
    public var f: Double
    public var fb: Double
    public var meal: Meal
    public var src: String?        // usda | typ | own | label | off | web | recipe | ai | quick | photo
    public var est: Bool
    public var t: Double?          // ms since 1970

    public init(id: String = FoodEntry.newID(), fid: String? = nil, name: String, brand: String? = nil, product: String? = nil,
                g: Double, k: Double, p: Double, c: Double, f: Double, fb: Double = 0, meal: Meal,
                src: String? = nil, est: Bool = false, t: Double? = Date().timeIntervalSince1970 * 1000) {
        self.id = id; self.fid = fid; self.name = name; self.brand = brand; self.product = product
        self.g = g; self.k = k; self.p = p; self.c = c; self.f = f; self.fb = fb; self.meal = meal
        self.src = src; self.est = est; self.t = t
    }
    public static func newID() -> String {
        String(UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased().prefix(8))
    }
    enum CodingKeys: String, CodingKey { case id, fid, name, brand, product, g, k, p, c, f, fb, meal, src, est, t }
    public init(from decoder: Decoder) throws {
        let c0 = try decoder.container(keyedBy: CodingKeys.self)
        id = c0.lenientString(.id) ?? FoodEntry.newID()
        fid = c0.lenientString(.fid)
        name = c0.lenientString(.name) ?? "Food"
        brand = c0.lenientString(.brand); product = c0.lenientString(.product)
        g = c0.lenientDouble(.g) ?? 0; k = c0.lenientDouble(.k) ?? 0
        p = c0.lenientDouble(.p) ?? 0; c = c0.lenientDouble(.c) ?? 0
        f = c0.lenientDouble(.f) ?? 0; fb = c0.lenientDouble(.fb) ?? 0
        meal = Meal(rawValue: c0.lenientString(.meal) ?? "s") ?? .s
        src = c0.lenientString(.src); est = c0.lenientBool(.est) ?? false
        t = c0.lenientDouble(.t)
    }
}

/// A named portion: ["1 cup", 240] in the web app's JSON.
public struct Portion: Codable, Sendable, Equatable, Hashable {
    public var label: String
    public var g: Double
    public init(_ label: String, _ g: Double) { self.label = label; self.g = g }
    public init(from decoder: Decoder) throws {
        var c = try decoder.unkeyedContainer()
        label = (try? c.decode(String.self)) ?? "portion"
        if let d = try? c.decode(Double.self) { g = d } else if let s = try? c.decode(String.self), let d = Double(s) { g = d } else { g = 100 }
    }
    public func encode(to encoder: Encoder) throws {
        var c = encoder.unkeyedContainer()
        try c.encode(label); try c.encode(g)
    }
}

public struct SourceLink: Codable, Sendable, Equatable {
    public var url: String?
    public var title: String?
    public init(url: String? = nil, title: String? = nil) { self.url = url; self.title = title }
}

/// A food you saved: from a label photo, a barcode, an online lookup, or by hand.
/// Values per 100 g.
public struct OwnFood: Codable, Sendable, Equatable, Identifiable {
    public var key: String
    public var name: String
    public var brand: String
    public var code: String
    public var src: String?
    public var kcal: Double
    public var p: Double
    public var c: Double
    public var f: Double
    public var fb: Double
    public var portions: [Portion]
    public var source: SourceLink?
    public var checked: Bool?
    public var saved: Double?
    public var id: String { key }

    public init(key: String = "c_" + FoodEntry.newID(), name: String, brand: String = "", code: String = "", src: String? = nil,
                kcal: Double, p: Double, c: Double, f: Double, fb: Double = 0, portions: [Portion] = [],
                source: SourceLink? = nil, checked: Bool? = nil, saved: Double? = Date().timeIntervalSince1970 * 1000) {
        self.key = key; self.name = name; self.brand = brand; self.code = code; self.src = src
        self.kcal = kcal; self.p = p; self.c = c; self.f = f; self.fb = fb; self.portions = portions
        self.source = source; self.checked = checked; self.saved = saved
    }
    enum CodingKeys: String, CodingKey { case key, name, brand, code, src, kcal, p, c, f, fb, portions, source, checked, saved }
    public init(from decoder: Decoder) throws {
        let c0 = try decoder.container(keyedBy: CodingKeys.self)
        key = c0.lenientString(.key) ?? ("c_" + FoodEntry.newID())
        name = c0.lenientString(.name) ?? "Food"
        brand = c0.lenientString(.brand) ?? ""; code = c0.lenientString(.code) ?? ""
        src = c0.lenientString(.src)
        kcal = c0.lenientDouble(.kcal) ?? 0; p = c0.lenientDouble(.p) ?? 0
        c = c0.lenientDouble(.c) ?? 0; f = c0.lenientDouble(.f) ?? 0; fb = c0.lenientDouble(.fb) ?? 0
        portions = c0.lenient([Portion].self, .portions) ?? []
        source = c0.lenient(SourceLink.self, .source)
        checked = c0.lenientBool(.checked); saved = c0.lenientDouble(.saved)
    }
}

public struct RecipeItem: Codable, Sendable, Equatable {
    public var fid: String?
    public var name: String
    public var g: Double
    public var k: Double
    public var p: Double
    public var c: Double
    public var f: Double
    public var fb: Double
    public var est: Bool
    public init(fid: String? = nil, name: String, g: Double, k: Double, p: Double, c: Double, f: Double, fb: Double = 0, est: Bool = false) {
        self.fid = fid; self.name = name; self.g = g; self.k = k; self.p = p; self.c = c; self.f = f; self.fb = fb; self.est = est
    }
    enum CodingKeys: String, CodingKey { case fid, name, g, k, p, c, f, fb, est }
    public init(from decoder: Decoder) throws {
        let c0 = try decoder.container(keyedBy: CodingKeys.self)
        fid = c0.lenientString(.fid); name = c0.lenientString(.name) ?? "Item"
        g = c0.lenientDouble(.g) ?? 0; k = c0.lenientDouble(.k) ?? 0; p = c0.lenientDouble(.p) ?? 0
        c = c0.lenientDouble(.c) ?? 0; f = c0.lenientDouble(.f) ?? 0; fb = c0.lenientDouble(.fb) ?? 0
        est = c0.lenientBool(.est) ?? false
    }
}

public struct Recipe: Codable, Sendable, Equatable, Identifiable {
    public var key: String
    public var name: String
    public var items: [RecipeItem]
    public var cookedG: Double?
    public var servings: Double?
    public var id: String { key }
    public init(key: String = "r_" + FoodEntry.newID(), name: String, items: [RecipeItem] = [], cookedG: Double? = nil, servings: Double? = nil) {
        self.key = key; self.name = name; self.items = items; self.cookedG = cookedG; self.servings = servings
    }
    enum CodingKeys: String, CodingKey { case key, name, items, cookedG, servings }
    public init(from decoder: Decoder) throws {
        let c0 = try decoder.container(keyedBy: CodingKeys.self)
        key = c0.lenientString(.key) ?? ("r_" + FoodEntry.newID()); name = c0.lenientString(.name) ?? "Recipe"
        items = c0.lenient([RecipeItem].self, .items) ?? []
        cookedG = c0.lenientDouble(.cookedG); servings = c0.lenientDouble(.servings)
    }
}

public struct Library: Codable, Sendable, Equatable {
    public var foods: [OwnFood] = []
    public var recipes: [Recipe] = []
    public init(foods: [OwnFood] = [], recipes: [Recipe] = []) { self.foods = foods; self.recipes = recipes }
    enum CodingKeys: String, CodingKey { case foods, recipes }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        foods = c.lenient([OwnFood].self, .foods) ?? []
        recipes = c.lenient([Recipe].self, .recipes) ?? []
    }
}

// MARK: - Day

public struct Sleep: Codable, Sendable, Equatable {
    public var asleep: Double?     // minutes
    public var inBed: Double?
    public var awake: Double?
    public var deep: Double?
    public var rem: Double?
    public var light: Double?
    public var start: String?      // "23:14" local
    public var end: String?
    public init(asleep: Double? = nil, inBed: Double? = nil, awake: Double? = nil, deep: Double? = nil, rem: Double? = nil,
                light: Double? = nil, start: String? = nil, end: String? = nil) {
        self.asleep = asleep; self.inBed = inBed; self.awake = awake; self.deep = deep; self.rem = rem
        self.light = light; self.start = start; self.end = end
    }
    enum CodingKeys: String, CodingKey { case asleep, inBed, awake, deep, rem, light, start, end }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        asleep = c.lenientDouble(.asleep); inBed = c.lenientDouble(.inBed); awake = c.lenientDouble(.awake)
        deep = c.lenientDouble(.deep); rem = c.lenientDouble(.rem); light = c.lenientDouble(.light)
        start = c.lenientString(.start); end = c.lenientString(.end)
    }
}

/// A workout session recorded by the tracker (walks, runs; lifting counted separately).
public struct ExerciseSession: Codable, Sendable, Equatable {
    public var type: String?
    public var name: String?
    public var min: Double
    public var kcal: Double?
    public var strength: Bool
    public init(type: String? = nil, name: String? = nil, min: Double, kcal: Double? = nil, strength: Bool = false) {
        self.type = type; self.name = name; self.min = min; self.kcal = kcal; self.strength = strength
    }
    enum CodingKeys: String, CodingKey { case type, name, min, kcal, strength }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        type = c.lenientString(.type); name = c.lenientString(.name)
        min = c.lenientDouble(.min) ?? 0; kcal = c.lenientDouble(.kcal); strength = c.lenientBool(.strength) ?? false
    }
}

public struct WorkoutSet: Codable, Sendable, Equatable {
    public var w: Double?          // kg
    public var r: Double           // reps (or seconds for timed holds)
    public var done: Bool
    public init(w: Double? = nil, r: Double, done: Bool = false) { self.w = w; self.r = r; self.done = done }
    enum CodingKeys: String, CodingKey { case w, r, done }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        w = c.lenientDouble(.w); r = c.lenientDouble(.r) ?? 0; done = c.lenientBool(.done) ?? false
    }
}

public struct WorkoutExercise: Codable, Sendable, Equatable, Identifiable {
    public var id: String          // exercise id, e.g. "squat"
    public var slot: String?
    public var key: String?
    public var label: String?
    public var sets: [WorkoutSet]
    public var lo: Double
    public var hi: Double
    public var rest: Double
    public var main: Bool
    public var note: String?
    public init(id: String, slot: String? = nil, key: String? = nil, label: String? = nil, sets: [WorkoutSet],
                lo: Double, hi: Double, rest: Double, main: Bool = false, note: String? = nil) {
        self.id = id; self.slot = slot; self.key = key; self.label = label; self.sets = sets
        self.lo = lo; self.hi = hi; self.rest = rest; self.main = main; self.note = note
    }
    enum CodingKeys: String, CodingKey { case id, slot, key, label, sets, lo, hi, rest, main, note }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = c.lenientString(.id) ?? ""; slot = c.lenientString(.slot); key = c.lenientString(.key); label = c.lenientString(.label)
        sets = c.lenient([WorkoutSet].self, .sets) ?? []
        lo = c.lenientDouble(.lo) ?? 8; hi = c.lenientDouble(.hi) ?? 12; rest = c.lenientDouble(.rest) ?? 90
        main = c.lenientBool(.main) ?? false; note = c.lenientString(.note)
    }
}

public struct PR: Codable, Sendable, Equatable {
    public var id: String
    public var e1rm: Double
    public var prev: Double
    public init(id: String, e1rm: Double, prev: Double) { self.id = id; self.e1rm = e1rm; self.prev = prev }
}

public struct Workout: Codable, Sendable, Equatable {
    public var idx: Int?
    public var name: String
    public var started: Double?
    public var ended: Double?
    public var ex: [WorkoutExercise]
    public var done: Bool
    public var deload: Bool?
    public var rir: Double?
    public var prs: [PR]?
    public init(idx: Int? = nil, name: String, started: Double? = nil, ended: Double? = nil, ex: [WorkoutExercise] = [],
                done: Bool = false, deload: Bool? = nil, rir: Double? = nil, prs: [PR]? = nil) {
        self.idx = idx; self.name = name; self.started = started; self.ended = ended; self.ex = ex
        self.done = done; self.deload = deload; self.rir = rir; self.prs = prs
    }
    enum CodingKeys: String, CodingKey { case idx, name, started, ended, ex, done, deload, rir, prs }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        idx = c.lenientInt(.idx); name = c.lenientString(.name) ?? "Workout"
        started = c.lenientDouble(.started); ended = c.lenientDouble(.ended)
        ex = c.lenient([WorkoutExercise].self, .ex) ?? []
        done = c.lenientBool(.done) ?? false; deload = c.lenientBool(.deload); rir = c.lenientDouble(.rir)
        prs = c.lenient([PR].self, .prs)
    }
}

public struct Day: Codable, Sendable, Equatable {
    public var foods: [FoodEntry] = []
    public var weight: Double?
    public var weightSrc: String?      // manual | fitbit | health
    public var waist: Double?
    public var steps: Double?
    public var stepsSrc: String?
    public var sleep: Sleep?
    public var rhr: Double?
    public var burn: Double?
    public var exercises: [ExerciseSession]?
    public var cardioMin: Double?
    public var cardioSrc: String?
    public var workout: Workout?

    public init(foods: [FoodEntry] = [], weight: Double? = nil, waist: Double? = nil, steps: Double? = nil, sleep: Sleep? = nil, workout: Workout? = nil) {
        self.foods = foods; self.weight = weight; self.waist = waist; self.steps = steps; self.sleep = sleep; self.workout = workout
    }
    enum CodingKeys: String, CodingKey { case foods, weight, weightSrc, waist, steps, stepsSrc, sleep, rhr, burn, exercises, cardioMin, cardioSrc, workout }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        foods = c.lenient([FoodEntry].self, .foods) ?? []
        weight = c.lenientDouble(.weight); weightSrc = c.lenientString(.weightSrc)
        waist = c.lenientDouble(.waist)
        steps = c.lenientDouble(.steps); stepsSrc = c.lenientString(.stepsSrc)
        sleep = c.lenient(Sleep.self, .sleep)
        rhr = c.lenientDouble(.rhr); burn = c.lenientDouble(.burn)
        exercises = c.lenient([ExerciseSession].self, .exercises)
        cardioMin = c.lenientDouble(.cardioMin); cardioSrc = c.lenientString(.cardioSrc)
        workout = c.lenient(Workout.self, .workout)
    }
    public var isEmpty: Bool {
        foods.isEmpty && weight == nil && waist == nil && steps == nil && sleep == nil && workout == nil
            && rhr == nil && burn == nil && (exercises ?? []).isEmpty && cardioMin == nil
    }
}

public typealias Days = [String: Day]

// MARK: - Backup

/// The web app's export format, also used natively for backups.
public struct Backup: Codable, Sendable {
    public var app: String = "plates"
    public var v: Int = 1
    public var exported: String?
    public var profile: Profile?
    public var library: Library
    public var days: Days

    public init(profile: Profile?, library: Library, days: Days, exported: Date = Date()) {
        self.profile = profile; self.library = library; self.days = days
        self.exported = ISO8601DateFormatter().string(from: exported)
    }
    enum CodingKeys: String, CodingKey { case app, v, exported, profile, library, days }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        app = c.lenientString(.app) ?? ""
        v = c.lenientInt(.v) ?? 1
        exported = c.lenientString(.exported)
        profile = c.lenient(Profile.self, .profile)
        library = c.lenient(Library.self, .library) ?? Library()
        // Decode day by day so one malformed day never sinks a restore.
        var days: Days = [:]
        if let raw = try? c.decode([String: LenientDay].self, forKey: .days) {
            for (k, v) in raw { if let d = v.day, Engine.isDateKey(k) { days[k] = d } }
        }
        self.days = days
    }

    public enum ImportError: Error, LocalizedError {
        case notPlates
        public var errorDescription: String? { "This file is not a Plates backup." }
    }

    /// Decodes a backup, rejecting files that aren't Plates backups.
    public static func decode(_ data: Data) throws -> Backup {
        let b = try JSONDecoder().decode(Backup.self, from: data)
        guard b.app == "plates", b.profile != nil else { throw ImportError.notPlates }
        return b
    }

    public func encoded(pretty: Bool = false) throws -> Data {
        let e = JSONEncoder()
        e.outputFormatting = pretty ? [.prettyPrinted, .sortedKeys] : [.sortedKeys]
        return try e.encode(self)
    }
}

struct LenientDay: Decodable {
    var day: Day?
    init(from decoder: Decoder) throws { day = try? Day(from: decoder) }
}
