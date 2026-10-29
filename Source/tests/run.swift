import Foundation
import JavaScriptCore
let root = URL(fileURLWithPath: CommandLine.arguments[1])
let context = JSContext()!
var failed = false
context.exceptionHandler = { _, value in
    failed = true
    fputs("JavaScript error: \(value?.toString() ?? "unknown")\n", stderr)
}
let printBlock: @convention(block) (String) -> Void = { print($0) }
context.setObject(printBlock, forKeyedSubscript: "print" as NSString)
for file in ["dictionary.js", "core.js", "importer.js", "tests/core-tests.js"] {
    let source = try String(contentsOf: root.appendingPathComponent(file), encoding: .utf8)
    _ = context.evaluateScript(source, withSourceURL: root.appendingPathComponent(file))
    if failed { exit(1) }
}
// Parse the actual delivered HTML script, including storage and UI code, without a DOM.
let html = try String(contentsOf: root.appendingPathComponent("dist/EnglishTraining.html"), encoding: .utf8)
if let start = html.range(of: "<script>"), let end = html.range(of: "</script>", range: start.upperBound..<html.endIndex) {
    let js = String(html[start.upperBound..<end.lowerBound])
    _ = context.evaluateScript("(function(){\n" + js + "\n})")
    if failed { exit(1) }
    print("PASS Delivered HTML JavaScript syntax (all application modules)")
} else { fputs("Missing inline application script\n", stderr); exit(1) }
let encodeBlock: @convention(block) (String) -> NSArray = { text in
    return text.utf8.map { NSNumber(value: $0) } as NSArray
}
let decodeBlock: @convention(block) (JSValue) -> NSString? = { value in
    guard let numbers = value.toArray() as? [NSNumber] else { return nil }
    let data = Data(numbers.map { $0.uint8Value })
    return String(data: data, encoding: .utf8) as NSString?
}
context.setObject(encodeBlock, forKeyedSubscript: "nativeEncode" as NSString)
context.setObject(decodeBlock, forKeyedSubscript: "nativeDecode" as NSString)
let importerTests = try String(contentsOf: root.appendingPathComponent("tests/import-tests.js"), encoding: .utf8)
_ = context.evaluateScript(importerTests, withSourceURL: root.appendingPathComponent("tests/import-tests.js"))
let deadline = Date().addingTimeInterval(10)
while context.objectForKeyedSubscript("ASYNC_DONE")?.toBool() != true && Date() < deadline && !failed {
    _ = context.evaluateScript("void 0")
    Thread.sleep(forTimeInterval: 0.005)
}
if context.objectForKeyedSubscript("ASYNC_DONE")?.toBool() != true { print("Async importer tests timed out"); exit(1) }
let failures = context.objectForKeyedSubscript("TEST_FAILURES")?.toInt32() ?? 1
print("TOTAL: 38 groups + full delivered-script syntax check")
exit(failures == 0 && !failed ? 0 : 1)
