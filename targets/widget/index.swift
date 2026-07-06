import WidgetKit
import SwiftUI

// Widget paketi giriş noktası (@main). Tüm widget türleri burada toplanır.
@main
struct NafuWidgetBundle: WidgetBundle {
    var body: some Widget {
        NafuWidget()
    }
}
