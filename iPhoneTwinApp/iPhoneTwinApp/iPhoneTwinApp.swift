import SwiftUI

@main
struct IPhoneTwinApp: App {
    @StateObject private var model = TwinViewModel()

    var body: some Scene {
        WindowGroup { ContentView().environmentObject(model) }
    }
}
