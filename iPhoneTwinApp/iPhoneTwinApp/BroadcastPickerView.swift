import ReplayKit
import SwiftUI
import UIKit

final class BroadcastPickerContainer: UIView {
    let picker = RPSystemBroadcastPickerView(frame: CGRect(x: 0, y: 0, width: 62, height: 62))

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        picker.backgroundColor = .clear
        picker.tintColor = .white
        picker.showsMicrophoneButton = false
        addSubview(picker)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func layoutSubviews() {
        super.layoutSubviews()
        picker.frame = bounds
        picker.subviews.compactMap { $0 as? UIButton }.forEach { button in
            button.frame = picker.bounds
            button.tintColor = .white
            button.imageView?.tintColor = .white
            button.imageView?.contentMode = .scaleAspectFit
            button.accessibilityLabel = "开始屏幕广播"
        }
    }
}

struct BroadcastPickerView: UIViewRepresentable {
    func makeUIView(context: Context) -> BroadcastPickerContainer {
        let container = BroadcastPickerContainer(frame: CGRect(x: 0, y: 0, width: 62, height: 62))
        container.picker.preferredExtension = Bundle.main.bundleIdentifier.map { $0 + ".Broadcast" }
        return container
    }

    func updateUIView(_ container: BroadcastPickerContainer, context: Context) {
        container.picker.preferredExtension = Bundle.main.bundleIdentifier.map { $0 + ".Broadcast" }
        container.setNeedsLayout()
    }
}

struct BroadcastControl: View {
    private var extensionEmbedded: Bool {
        guard let directory = Bundle.main.builtInPlugInsURL,
              let items = try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil) else { return false }
        return items.contains { $0.pathExtension == "appex" && $0.lastPathComponent.contains("iPhoneTwinBroadcast") }
    }

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 14).fill(.white.opacity(0.16))
                BroadcastPickerView().frame(width: 62, height: 62)
            }.frame(width: 62, height: 62)
            VStack(alignment: .leading, spacing: 3) {
                Text("② 开始屏幕同步").font(.headline)
                Text(extensionEmbedded ? "广播扩展已嵌入 · 点击左侧图标" : "广播扩展未嵌入 · 请重新安装")
                    .font(.caption).foregroundStyle(extensionEmbedded ? .white.opacity(0.78) : .yellow)
            }
            Spacer()
        }
        .padding(14).background(Color.blue.opacity(0.72), in: RoundedRectangle(cornerRadius: 18)).padding(.horizontal)
    }
}
