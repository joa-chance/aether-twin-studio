import CoreImage
import CoreMotion
import ReplayKit
import UIKit

final class SampleHandler: RPBroadcastSampleHandler {
    private let context = CIContext(options: [.cacheIntermediates: false])
    private var socket: URLSessionWebSocketTask?
    private var lastFrameTime = CMTime.invalid
    private var isSending = false
    private let motion = CMMotionManager()
    private let motionQueue: OperationQueue = {
        let queue = OperationQueue()
        queue.name = "com.example.iPhoneTwin.broadcast-motion"
        queue.maxConcurrentOperationCount = 1
        queue.qualityOfService = .userInteractive
        return queue
    }()
    private var referenceQuaternion: CMQuaternion?
    private let sharedDefaults = UserDefaults(suiteName: "group.com.example.iPhoneTwin")

    override func broadcastStarted(withSetupInfo setupInfo: [String : NSObject]?) {
        guard let value = sharedDefaults?.string(forKey: "syncServerURL"),
              let url = URL(string: value) else {
            finishBroadcastWithError(NSError(domain: "iPhoneTwinBroadcast", code: 1, userInfo: [NSLocalizedDescriptionKey:"请先打开 iPhone Twin 并保存同步服务器地址。"])); return
        }
        sharedDefaults?.set(true, forKey: "broadcastActive")
        let task = URLSession.shared.webSocketTask(with: url); socket = task; task.resume()
        task.send(.string(#"{"type":"screen-and-motion","room":"iphone16"}"#)) { [weak self] error in
            guard let self else { return }
            if let error { self.finishBroadcastWithError(error); return }
            self.startMotionUpdates()
        }
    }

    override func broadcastFinished() {
        motion.stopDeviceMotionUpdates()
        referenceQuaternion = nil
        sharedDefaults?.set(false, forKey: "broadcastActive")
        socket?.cancel(with: .normalClosure, reason: nil); socket = nil
    }

    private func startMotionUpdates() {
        guard motion.isDeviceMotionAvailable else { return }
        motion.deviceMotionUpdateInterval = 1.0 / 30.0
        motion.startDeviceMotionUpdates(using: .xArbitraryZVertical, to: motionQueue) { [weak self] sample, error in
            guard let self, let q = sample?.attitude.quaternion, error == nil, let socket = self.socket else { return }
            if self.referenceQuaternion == nil { self.referenceQuaternion = q }
            guard let reference = self.referenceQuaternion else { return }
            let relative = self.relativeQuaternion(from: reference, to: q)
            let payload: [String: Any] = ["type":"orientation", "x":relative.x, "y":relative.y, "z":relative.z, "w":relative.w, "ts":Date().timeIntervalSince1970, "source":"broadcast"]
            guard let data = try? JSONSerialization.data(withJSONObject: payload),
                  let text = String(data: data, encoding: .utf8) else { return }
            socket.send(.string(text)) { [weak self] error in
                if let error { self?.finishBroadcastWithError(error) }
            }
        }
    }

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

    override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer, with sampleBufferType: RPSampleBufferType) {
        guard sampleBufferType == .video, !isSending, let socket else { return }
        let time = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
        if lastFrameTime.isValid, CMTimeGetSeconds(time - lastFrameTime) < (1.0 / 20.0) { return }
        lastFrameTime = time
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        autoreleasepool {
            let source = CIImage(cvPixelBuffer: pixelBuffer)
            // 960p at 20 fps is smoother and lower-latency than sending larger
            // 1080p JPEGs that queue behind the encoder or Wi-Fi socket.
            let scale = min(1, 960 / max(source.extent.width, source.extent.height))
            let image = source.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
            guard let cg = context.createCGImage(image, from: image.extent),
                  let jpeg = UIImage(cgImage: cg).jpegData(compressionQuality: 0.68) else { return }
            isSending = true
            socket.send(.data(jpeg)) { [weak self] error in
                self?.isSending = false
                if let error { self?.finishBroadcastWithError(error) }
            }
        }
    }
}
