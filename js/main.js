import { GestureRecognizer } from './gesture-recognition.js';
import { ParticlePlanet } from './particle-planet.js';

async function main() {
    const videoElement = document.querySelector('.input_video');
    const canvasElement = document.querySelector('.output_canvas');
    const sceneContainer = document.querySelector('#scene-container');
    const loadingElement = document.querySelector('#loading');
    const statusElement = document.getElementById('loading-text');

    // 1. 初始化粒子星球
    const planet = new ParticlePlanet(sceneContainer);
    planet.init();

    // 2. 初始化手势识别
    const gestureRecognizer = new GestureRecognizer(videoElement, canvasElement);
    
    try {
        statusElement.innerText = "加载 AI 模型中 (约 10MB)...";
        await gestureRecognizer.init();
        
        statusElement.innerText = "请求摄像头权限...";
        
        // 获取 HTML 中的启动按钮
        const startButton = document.getElementById('start-btn');
        
        // 模型加载完成后显示按钮
        startButton.style.display = 'block';
        statusElement.innerText = "准备就绪，等待启动...";
        
        // 等待用户点击
        await new Promise(resolve => {
            startButton.onclick = () => {
                startButton.innerText = "正在启动...";
                startButton.style.opacity = "0.5";
                startButton.style.pointerEvents = "none";
                resolve();
            };
        });

        // 启动摄像头
        await gestureRecognizer.start();
        
        // 隐藏加载提示
        loadingElement.style.opacity = '0';
        setTimeout(() => {
            loadingElement.style.display = 'none';
        }, 1000);
        console.log("系统启动完成");
    } catch (error) {
        console.error("Initialization failed:", error);
        statusElement.innerHTML = `<span style="color:#ff4444">启动失败: ${error.message}</span><br><span style="font-size:12px;color:#888">请检查摄像头权限或使用 HTTPS/Localhost 访问</span>`;
        // 即使摄像头失败，特效依然运行
        loadingElement.style.background = "rgba(0,0,0,0.8)"; // 让背景半透明，至少能看到特效
        setTimeout(() => {
            loadingElement.style.display = 'none';
        }, 3000);
    }

    // 3. 动画循环
    function animate() {
        requestAnimationFrame(animate);

        // 获取当前手势数据
        const gestureData = gestureRecognizer.getGesture();

        // 更新星球特效
        planet.update(gestureData);
    }

    animate();
}

// 确保页面加载完成后执行
window.addEventListener('DOMContentLoaded', main);
