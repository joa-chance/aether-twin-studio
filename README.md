# AetherTwin Studio

实时物理设备数字孪生工作台。项目使用 TypeScript、Three.js 与 iOS 原生能力，将实体手机的姿态和屏幕画面同步到网页中的高精度 3D 模型。

## 功能

- GLB 手机模型实时渲染与鼠标旋转
- Core Motion 姿态同步与一键校准
- ReplayKit 屏幕广播
- 可切换的明暗场景与动态灯光
- 主要部件点击交互
- PNG 截图、网页截图与录制控制
- 模型屏幕复位、底座与阴影显隐

## 系统要求

- Node.js 20 或更高版本
- npm 10 或更高版本
- 支持 WebGL 2 的现代浏览器
- macOS 与 Xcode 16（仅在构建 iOS 伴侣 App 时需要）
- iOS 17 或更高版本（仅在使用真机同步时需要）

## 快速开始

安装依赖并启动网页：

```bash
npm install
npm run dev
```

另开一个终端启动同步中继：

```bash
npm run sync
```

Vite 会在终端显示网页地址。电脑本机可使用 `http://127.0.0.1:5173/`；局域网设备应使用电脑的局域网 IP。

同步服务每次启动都会生成随机配对 Token。请使用网页显示的完整 WebSocket 地址连接，不要把 Token 写进源代码或提交到 GitHub。

## iOS 伴侣 App

工程位于：

```text
iPhoneTwinApp/iPhoneTwinApp.xcodeproj
```

1. 使用 Xcode 打开工程。
2. 分别为主 App 和 Broadcast Extension 选择自己的 Developer Team。
3. 将两个 Bundle Identifier 改为自己拥有的唯一值。
4. 为两个 Target 配置相同且唯一的 App Group，并同步修改 Swift 文件和 entitlements。
5. 连接 iPhone，选择真机后运行。
6. 在 App 中输入网页提供的完整 WebSocket 地址。
7. 启动姿态同步，再通过系统广播选择器开启屏幕同步。

更详细的说明见 [`iPhoneTwinApp/README.md`](iPhoneTwinApp/README.md)。

## 项目结构

```text
src/                 Three.js 工作台与同步客户端
public/models/       GLB 模型与运行时素材
iPhoneTwinApp/       SwiftUI 主 App 与 ReplayKit 扩展
sync-server.mjs      局域网 WebSocket 中继
```

## 安全说明

- 同步中继默认监听局域网接口，不应直接暴露到公网。
- 配对 Token 只用于当前进程，服务重启后自动更新。
- 不要提交 Apple Team ID、签名证书、Provisioning Profile 或个人服务器地址。
- 屏幕画面仅在本地网络中转；使用者应自行确认网络环境可信。

## 构建

```bash
npm run build
npm run preview
```

## 许可证

- TypeScript、JavaScript 和 Swift 源代码采用 [MIT License](LICENSE)。
- 3D 模型、贴图、图片及其他视觉素材采用 [CC BY 4.0](LICENSE-ASSETS.md)。

项目及素材版权所有 © 2026 Joa Chance。
