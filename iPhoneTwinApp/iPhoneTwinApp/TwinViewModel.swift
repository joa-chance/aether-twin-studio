import CoreMotion
import Foundation

enum ConnectionStatus: Equatable { case idle, connecting, connected, failed(String) }

@MainActor
final class TwinViewModel: ObservableObject {
    @Published var serverURL = UserDefaults.standard.string(forKey: "serverURL") ?? ""
    @Published private(set) var status: ConnectionStatus = .idle
    @Published private(set) var motionSummary = "等待启动"
    @Published private(set) var isRunning = false

    private let motion = CMMotionManager()
    private var socket: URLSessionWebSocketTask?
    private var sendCounter = 0
    private var referenceQuaternion: CMQuaternion?
    private let sharedDefaults = UserDefaults(suiteName: "group.com.example.iPhoneTwin")

    func start() {
        guard let url = URL(string: serverURL), motion.isDeviceMotionAvailable else {
            status = .failed("地址无效或设备不支持姿态传感器"); return
        }
        UserDefaults.standard.set(serverURL, forKey: "serverURL")
        UserDefaults(suiteName: "group.com.example.iPhoneTwin")?.set(serverURL, forKey: "syncServerURL")
        status = .connecting; isRunning = true
        let task = URLSession.shared.webSocketTask(with: url); socket = task; task.resume()
        task.send(.string(#"{"type":"device","room":"iphone16"}"#)) { [weak self] error in
            Task { @MainActor in
                guard let self else { return }
                if let error { self.status = .failed(error.localizedDescription); self.isRunning = false }
                else { self.status = .connected; self.beginMotion() }
            }
        }
    }

    func stop() {
        motion.stopDeviceMotionUpdates(); socket?.cancel(with: .normalClosure, reason: nil); socket = nil
        referenceQuaternion = nil
        isRunning = false; status = .idle; motionSummary = "等待启动"
    }

    private func beginMotion() {
        motion.deviceMotionUpdateInterval = 1.0 / 60.0
        motion.startDeviceMotionUpdates(using: .xArbitraryZVertical, to: .main) { [weak self] sample, error in
            guard let self, let q = sample?.attitude.quaternion, error == nil else { return }
            if self.sharedDefaults?.bool(forKey: "broadcastActive") == true {
                self.motionSummary = "姿态由广播扩展同步"
                return
            }
            if self.referenceQuaternion == nil { self.referenceQuaternion = q }
            guard let reference = self.referenceQuaternion else { return }
            let relative = self.relativeQuaternion(from: reference, to: q)
            self.sendCounter += 1
            self.motionSummary = String(format: "x %.3f  y %.3f  z %.3f", relative.x, relative.y, relative.z)
            let payload: [String: Any] = ["type":"orientation", "x":relative.x, "y":relative.y, "z":relative.z, "w":relative.w, "ts":Date().timeIntervalSince1970]
            guard let data = try? JSONSerialization.data(withJSONObject: payload), let text = String(data: data, encoding: .utf8) else { return }
            self.socket?.send(.string(text)) { [weak self] error in
                if let error { Task { @MainActor in self?.status = .failed(error.localizedDescription) } }
            }
        }
    }

    /// Makes the phone pose at the moment “开始同步” is tapped the identity pose.
    /// Core Motion and Three.js then share the same portrait device axes: +X right,
    /// +Y toward the top edge and +Z out through the display.
    private func relativeQuaternion(from reference: CMQuaternion, to current: CMQuaternion) -> CMQuaternion {
        let a = CMQuaternion(x: -reference.x, y: -reference.y, z: -reference.z, w: reference.w)
        let b = current
        return CMQuaternion(
            x: a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y,
            y: a.w*b.y - a.x*b.z + a.y*b.w + a.z*b.x,
            z: a.w*b.z + a.x*b.y - a.y*b.x + a.z*b.w,
            w: a.w*b.w - a.x*b.x - a.y*b.y - a.z*b.z
        )
    }
}
