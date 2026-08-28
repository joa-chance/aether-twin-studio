# iPhone Twin iOS App

这是网页三维模型的局域网姿态伴侣 App。它使用 Core Motion 以 60 Hz 读取四元数，并通过 WebSocket 发送到电脑。

## 安装

1. Mac 安装完整 Xcode。
2. 打开 `iPhoneTwinApp.xcodeproj`。
3. 在两个 Target 的 Signing & Capabilities 选择同一个 Apple Developer Team。主 App 使用唯一 Bundle Identifier，广播扩展必须使用“主 App Bundle Identifier + `.Broadcast`”。
4. 为两个 Target 启用同一个 App Group：`group.com.example.iPhoneTwin`。若修改这个值，Swift 源码和两个 entitlements 文件也必须保持一致。
5. 用 USB 连接 iPhone，选择真机后 Run。
6. 电脑运行网站和同步服务；将网页显示的带 `token` 完整地址填入 App。

当前版本同时包含姿态同步和 ReplayKit Broadcast Upload Extension。屏幕广播必须由用户在 App 内的系统广播按钮或控制中心手动开始。
