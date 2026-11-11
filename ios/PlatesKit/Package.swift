// swift-tools-version: 6.0
// PlatesKit: everything in Plates that isn't UI. Pure logic ported from the web
// app (engine, program, coach, scan parsing, health mapping, food search), the
// data model and its JSON store, and the Anthropic / Open Food Facts / Google
// Health clients. Builds and tests on macOS and Linux:  swift test
import PackageDescription

let package = Package(
    name: "PlatesKit",
    platforms: [.iOS(.v18), .macOS(.v15)],
    products: [.library(name: "PlatesKit", targets: ["PlatesKit"])],
    targets: [
        .target(
            name: "PlatesKit",
            resources: [.copy("Resources/foods.json"), .copy("Resources/exercises.json")],
            swiftSettings: [.swiftLanguageMode(.v5)]
        ),
        .testTarget(
            name: "PlatesKitTests",
            dependencies: ["PlatesKit"],
            swiftSettings: [.swiftLanguageMode(.v5)]
        ),
    ]
)
