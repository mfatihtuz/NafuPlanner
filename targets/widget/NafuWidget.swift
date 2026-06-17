import WidgetKit
import SwiftUI

// MARK: - App Group + anahtar (JS tarafıyla BİREBİR aynı olmalı)

private let APP_GROUP = "group.com.nafuplanner.app"
private let SNAPSHOT_KEY = "today_snapshot"
private let DEEP_LINK = URL(string: "nafu:///today")!

// MARK: - Model (src/domain/widget.ts WidgetSnapshot ile birebir şema)

private struct WidgetItem: Codable, Identifiable {
    let id: String
    let title: String
    let timeLabel: String
    let priority: String   // "low" | "medium" | "high" | "urgent"
    let overdue: Bool
}

private struct WidgetSnapshot: Codable {
    let generatedAtMs: Double
    let dateLabel: String
    let weekdayLabel: String
    let todayTotal: Int
    let todayDone: Int
    let overdueOpen: Int
    let items: [WidgetItem]

    /// Bugün yapılacak gerçek iş sayısı: açık geciken + bugünün tamamlanmamışı.
    var actionable: Int { overdueOpen + max(todayTotal - todayDone, 0) }

    /// İlerleme oranı (0...1). Bugüne planlı görev yoksa ve iş de yoksa tamdır.
    var progress: Double {
        if todayTotal > 0 { return min(Double(todayDone) / Double(todayTotal), 1) }
        return actionable == 0 ? 1 : 0
    }
}

private func loadSnapshot() -> WidgetSnapshot? {
    guard
        let defaults = UserDefaults(suiteName: APP_GROUP),
        let raw = defaults.string(forKey: SNAPSHOT_KEY),
        let data = raw.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
}

// MARK: - Renkler (marka paleti; tek kaynak src/ui/theme/colors.ts)

private extension Color {
    init(hex: String) {
        let s = Scanner(string: hex.replacingOccurrences(of: "#", with: ""))
        var v: UInt64 = 0
        s.scanHexInt64(&v)
        self.init(
            .sRGB,
            red: Double((v & 0xFF0000) >> 16) / 255,
            green: Double((v & 0x00FF00) >> 8) / 255,
            blue: Double(v & 0x0000FF) / 255,
            opacity: 1
        )
    }
}

private enum Brand {
    static let gradientTop = Color(hex: "1AA597")
    static let gradientBottom = Color(hex: "0B6F66")
    static let coral = Color(hex: "FF7A59")
    static let coralSoft = Color(hex: "FFB3A0")

    /// Teal zemin üzerinde görünür kalsın diye açıltılmış öncelik renkleri.
    static func priorityDot(_ p: String) -> Color {
        switch p {
        case "urgent": return Color(hex: "FF8A78")
        case "high": return Color(hex: "FFB3A0")
        case "low": return Color(hex: "CFF3EC")
        default: return Color(hex: "F6D679") // medium
        }
    }
}

// MARK: - Timeline

private struct NafuEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
}

private struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> NafuEntry {
        NafuEntry(date: Date(), snapshot: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (NafuEntry) -> Void) {
        completion(NafuEntry(date: Date(), snapshot: loadSnapshot()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NafuEntry>) -> Void) {
        let entry = NafuEntry(date: Date(), snapshot: loadSnapshot())
        // "Günüm" widget'ı: gün değişince kendiliğinden yenilensin diye gece
        // yarısına kadar geçerli. Asıl güncelleme uygulama önplandayken yapılır
        // (ExtensionStorage.reloadWidget — bütçeden düşmez).
        let startOfTomorrow = Calendar.current.startOfDay(
            for: Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date().addingTimeInterval(3600)
        )
        completion(Timeline(entries: [entry], policy: .after(startOfTomorrow)))
    }
}

// MARK: - Ortak parçalar

private extension View {
    /// Ana ekran (system) widget'ları için marka teal degrade zemini.
    @ViewBuilder func nafuSystemBackground() -> some View {
        let gradient = LinearGradient(
            colors: [Brand.gradientTop, Brand.gradientBottom],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        if #available(iOS 17.0, *) {
            self.containerBackground(for: .widget) { gradient }
        } else {
            self.background(gradient)
        }
    }
}

private struct ProgressBar: View {
    let value: Double
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(.white.opacity(0.25))
                Capsule().fill(.white).frame(width: max(6, geo.size.width * value))
            }
        }
        .frame(height: 6)
    }
}

private struct OverduePill: View {
    let count: Int
    var body: some View {
        Text("\(count) geciken")
            .font(.system(size: 11, weight: .semibold, design: .rounded))
            .foregroundStyle(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(Capsule().fill(Brand.coral))
    }
}

private struct Wordmark: View {
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "checkmark.seal.fill").font(.system(size: 12))
            Text("nafu").font(.system(size: 13, weight: .heavy, design: .rounded))
        }
        .foregroundStyle(.white.opacity(0.9))
    }
}

private struct TaskRow: View {
    let item: WidgetItem
    var body: some View {
        HStack(spacing: 8) {
            Circle().fill(Brand.priorityDot(item.priority)).frame(width: 7, height: 7)
            Text(item.title)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.white)
                .lineLimit(1)
            Spacer(minLength: 4)
            if !item.timeLabel.isEmpty {
                Text(item.timeLabel)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(item.overdue ? Brand.coralSoft : .white.opacity(0.8))
                    .lineLimit(1)
            }
        }
    }
}

// MARK: - Ana ekran (Home Screen) görünümleri

private struct SmallView: View {
    let snap: WidgetSnapshot?
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Wordmark()
            Spacer(minLength: 6)
            if let s = snap {
                Text("\(s.actionable)")
                    .font(.system(size: 44, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                Text(s.actionable == 0 ? "bugün boş 🎉" : "iş kaldı")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.white.opacity(0.85))
                Spacer(minLength: 6)
                if s.overdueOpen > 0 {
                    OverduePill(count: s.overdueOpen)
                    Spacer(minLength: 6)
                }
                ProgressBar(value: s.progress)
            } else {
                Spacer()
                Text("Açıp güncelle")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.white.opacity(0.85))
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(DEEP_LINK)
    }
}

private struct MediumView: View {
    let snap: WidgetSnapshot?
    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .leading, spacing: 0) {
                Wordmark()
                Spacer(minLength: 4)
                if let s = snap {
                    Text("\(s.actionable)")
                        .font(.system(size: 40, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                    Text(s.actionable == 0 ? "bugün boş" : "iş kaldı")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.white.opacity(0.85))
                    Spacer(minLength: 6)
                    if s.overdueOpen > 0 { OverduePill(count: s.overdueOpen) }
                    Spacer(minLength: 6)
                    ProgressBar(value: s.progress)
                }
            }
            .frame(width: 110, alignment: .leading)

            VStack(alignment: .leading, spacing: 7) {
                if let s = snap {
                    Text("\(s.weekdayLabel), \(s.dateLabel)")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.9))
                    if s.items.isEmpty {
                        Spacer()
                        Text("Bugün için planlı iş yok.")
                            .font(.system(size: 13))
                            .foregroundStyle(.white.opacity(0.85))
                        Spacer()
                    } else {
                        ForEach(s.items.prefix(3)) { TaskRow(item: $0) }
                        if s.actionable > 3 {
                            Text("+\(s.actionable - 3) tane daha")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(.white.opacity(0.7))
                        }
                    }
                }
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(DEEP_LINK)
    }
}

private struct LargeView: View {
    let snap: WidgetSnapshot?
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                Wordmark()
                Spacer()
                if let s = snap {
                    Text("\(s.weekdayLabel), \(s.dateLabel)")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.9))
                }
            }

            if let s = snap {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text("\(s.actionable)")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                    Text(s.actionable == 0 ? "bugün her şey tamam 🎉" : "iş kaldı")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.white.opacity(0.85))
                    Spacer()
                    if s.overdueOpen > 0 { OverduePill(count: s.overdueOpen) }
                }
                ProgressBar(value: s.progress)

                if s.items.isEmpty {
                    Spacer()
                    HStack {
                        Spacer()
                        VStack(spacing: 6) {
                            Image(systemName: "checkmark.circle.fill").font(.system(size: 30)).foregroundStyle(.white)
                            Text("Bugün için planlı iş yok").font(.system(size: 14)).foregroundStyle(.white.opacity(0.85))
                        }
                        Spacer()
                    }
                    Spacer()
                } else {
                    VStack(alignment: .leading, spacing: 9) {
                        ForEach(s.items.prefix(7)) { TaskRow(item: $0) }
                    }
                    .padding(.top, 2)
                    if s.actionable > 7 {
                        Text("+\(s.actionable - 7) tane daha")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(.white.opacity(0.7))
                    }
                    Spacer(minLength: 0)
                }
            } else {
                Spacer()
                Text("Listeni görmek için uygulamayı aç")
                    .font(.system(size: 14)).foregroundStyle(.white.opacity(0.85))
                Spacer()
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(DEEP_LINK)
    }
}

// MARK: - Kilit ekranı (Lock Screen) accessory görünümleri

private struct AccessoryRectView: View {
    let snap: WidgetSnapshot?
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
                Image(systemName: "checklist")
                Text("Bugün").font(.headline)
            }
            if let s = snap {
                Text(s.actionable == 0 ? "Her şey tamam 🎉" : "\(s.actionable) iş kaldı")
                    .font(.system(size: 13, weight: .semibold))
                if let first = s.items.first {
                    Text(first.title).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                }
            } else {
                Text("Açıp güncelle").font(.caption)
            }
        }
        .widgetURL(DEEP_LINK)
    }
}

private struct AccessoryCircView: View {
    let snap: WidgetSnapshot?
    var body: some View {
        Gauge(value: snap?.progress ?? 0) {
            Image(systemName: "checklist")
        } currentValueLabel: {
            Text("\(snap?.actionable ?? 0)")
        }
        .gaugeStyle(.accessoryCircular)
        .widgetURL(DEEP_LINK)
    }
}

private struct AccessoryInlineView: View {
    let snap: WidgetSnapshot?
    var body: some View {
        if let s = snap {
            Label(
                s.actionable == 0 ? "Bugün her şey tamam" : "\(s.actionable) iş bugün",
                systemImage: "checklist"
            )
            .widgetURL(DEEP_LINK)
        } else {
            Label("Nafu — günüm", systemImage: "checklist").widgetURL(DEEP_LINK)
        }
    }
}

// MARK: - Aile dağıtıcı

private struct NafuEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: Provider.Entry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallView(snap: entry.snapshot).nafuSystemBackground()
        case .systemMedium:
            MediumView(snap: entry.snapshot).nafuSystemBackground()
        case .systemLarge:
            LargeView(snap: entry.snapshot).nafuSystemBackground()
        case .accessoryRectangular:
            AccessoryRectView(snap: entry.snapshot)
        case .accessoryCircular:
            AccessoryCircView(snap: entry.snapshot)
        case .accessoryInline:
            AccessoryInlineView(snap: entry.snapshot)
        default:
            SmallView(snap: entry.snapshot).nafuSystemBackground()
        }
    }
}

// MARK: - Widget tanımı

struct NafuWidget: Widget {
    let kind = "NafuWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            NafuEntryView(entry: entry)
        }
        .configurationDisplayName("Nafu — Günüm")
        .description("Bugünün görevlerini ve ilerlemeni gösterir.")
        .supportedFamilies([
            .systemSmall, .systemMedium, .systemLarge,
            .accessoryRectangular, .accessoryCircular, .accessoryInline,
        ])
    }
}
