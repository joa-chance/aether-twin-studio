import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var model: TwinViewModel

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(colors: [.black, Color(red: 0.12, green: 0.11, blue: 0.10)], startPoint: .top, endPoint: .bottom).ignoresSafeArea()
                ScrollView {
                    VStack(spacing: 22) {
                        Image(systemName: "iphone.gen3.radiowaves.left.and.right")
                            .font(.system(size: 52, weight: .thin)).foregroundStyle(.white)
                        VStack(spacing: 6) {
                            Text("iPhone Twin").font(.largeTitle.bold())
                            Text("让网页模型跟随这台 iPhone").foregroundStyle(.secondary)
                        }
                        VStack(alignment: .leading, spacing: 8) {
                            Text("同步服务器").font(.caption).foregroundStyle(.secondary)
                            TextField("ws://YOUR_MAC_IP:8765", text: $model.serverURL)
                                .textInputAutocapitalization(.never).keyboardType(.URL)
                                .padding(14).background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 14))
                        }.padding(.horizontal)
                        statusCard
                        Button(model.isRunning ? "停止姿态同步" : "① 开始姿态同步") {
                            model.isRunning ? model.stop() : model.start()
                        }
                        .buttonStyle(.borderedProminent).controlSize(.large).tint(model.isRunning ? .red : .blue)
                        BroadcastControl()
                        Text("先完成第 ① 步，再点击第 ② 步的圆形广播图标，并在系统面板中确认开始广播。")
                            .font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center).padding(.horizontal, 30)
                    }.padding(.vertical, 28)
                }.scrollIndicators(.hidden).scrollDismissesKeyboard(.interactively)
            }.foregroundStyle(.white).navigationTitle("").navigationBarHidden(true)
        }
    }

    private var statusCard: some View {
        HStack(spacing: 13) {
            Circle().fill(model.status.color).frame(width: 10, height: 10)
            VStack(alignment: .leading, spacing: 3) {
                Text(model.status.title).font(.headline)
                Text(model.motionSummary).font(.caption.monospacedDigit()).foregroundStyle(.secondary)
            }
            Spacer()
        }.padding(16).background(.white.opacity(0.07), in: RoundedRectangle(cornerRadius: 18)).padding(.horizontal)
    }
}

extension ConnectionStatus {
    var title: String {
        switch self { case .idle: "尚未连接"; case .connecting: "正在连接"; case .connected: "姿态同步中"; case .failed(let text): "连接失败：\(text)" }
    }
    var color: Color {
        switch self { case .idle: .gray; case .connecting: .orange; case .connected: .green; case .failed: .red }
    }
}
