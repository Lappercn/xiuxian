# Xiuxian Particle - 星际修仙手势交互系统

## 🌌 项目简介
本项目是一款基于 WebGL (Three.js) 和 MediaPipe AI 手势识别的沉浸式修仙风格粒子特效系统。用户只需通过摄像头做出特定手势，即可召唤剑阵、黑洞、雷电等修仙特效，体验“言出法随”的快感。

核心特色：
- **纯前端运行**：基于 WebAssembly 和 TFLite，无需后端 GPU 服务器。
- **即时响应**：低延迟手势追踪，粒子效果流畅丝滑。
- **修仙美学**：融合太极、八卦、剑气等东方玄幻元素的粒子视觉设计。

## 🎮 核心功能
- **手势结印**：支持单手/双手 10+ 种手势识别（如剑指、合十、比心、结印等）。
- **粒子演化**：粒子系统根据手势实时变换形态（万剑归宗、虚空黑洞、太极八卦阵等）。
- **环境互动**：动态星空背景、迷雾与辉光特效随招式变化。

## 🌐 在线体验
- **官方网站**: [tongzhilian.cn](https://tongzhilian.cn)
- **GitHub**: [Lappercn/xiuxian](https://github.com/Lappercn/xiuxian.git)

## 🛠️ 技术栈
- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **3D 渲染**: Three.js (WebGL)
- **AI 视觉**: Google MediaPipe Hands (WASM/TFLite)
- **后端**: Flask (仅用于静态资源托管与缓存优化)

## 🚀 快速开始

### 1. 环境准备
确保已安装 Python 3.x (用于本地服务器) 或任意 Web 服务器环境。

### 2. 下载项目
```bash
git clone https://github.com/Lappercn/xiuxian.git
cd xiuxian
```

### 3. 安装依赖 (可选)
如果使用 Python 启动服务器：
```bash
pip install flask
```

### 4. 启动服务
```bash
python server.py
```
浏览器打开 `http://localhost:5000`，允许摄像头权限即可开始修仙！

## 🤝 加入我们
我们是一个热爱技术与修仙文化的开发团队，致力于打造最酷炫的 Web 交互体验。

**Why Join Us?**
- 参与前沿 WebAI 技术落地
- 探索东方美学与计算机图形学的结合
- 开放包容的开源社区氛围

如果你对 WebGL、AI 交互或修仙题材感兴趣，欢迎提交 PR 或联系我们！

---
*Developed by [LapperCN Team](https://tongzhilian.cn)*
