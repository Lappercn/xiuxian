/**
 * 手势识别模块增强版
 * 基于 MediaPipe Hands
 * 
 * 2025-12-06 更新: 移除 camera_utils 依赖，改用原生 getUserMedia 以提高兼容性和可调试性
 */
export class GestureRecognizer {
    constructor(videoElement, canvasElement) {
        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        this.canvasCtx = canvasElement.getContext('2d');
        
        // 存储当前手势状态
        this.gestureState = {
            isPresent: false,
            handCount: 0,          // 手的数量
            position: { x: 0.5, y: 0.5 }, // 0-1 (单手时为手心，双手时为中心)
            
            // 单手属性 (优先取第一只手)
            openness: 0,           
            pinchDistance: 0,      
            isOk: false,           
            isVictory: false,
            isRock: false,
            isThumbUp: false,
            
            // 双手属性
            handsDistance: 0,      // 双手距离
            isNamaste: false,      // 双手合十
            isTriangle: false,     // 双手结印(三角形)
            
            name: 'Initializing...'
        };

        this.hands = null;
        this.animationFrameId = null;
        this.lastVideoTime = -1;
        
        // 状态防抖/平滑
        this.lastOkTime = 0;
    }

    async init() {
        console.log("正在加载 MediaPipe Hands 模型...");
        this.gestureState.name = "Loading Model...";
        
        const updateProgress = (loaded, total, fileName, stepInfo) => {
            const progressBar = document.getElementById('progress-bar');
            const progressContainer = document.getElementById('progress-bar-container');
            const progressDetail = document.getElementById('progress-detail');
            const loadingText = document.getElementById('loading-text');
            
            if (progressContainer) progressContainer.style.display = 'block';
            if (loadingText) loadingText.innerText = `正在下载 AI 模型 (${stepInfo})...`;
            
            if (total > 0) {
                const percent = Math.min(100, Math.round((loaded / total) * 100));
                if (progressBar) progressBar.style.width = `${percent}%`;
                if (progressDetail) progressDetail.innerText = `${fileName} (${(loaded/1024/1024).toFixed(1)}MB / ${(total/1024/1024).toFixed(1)}MB)`;
            } else {
                // 无法获取大小时的显示
                if (progressBar) progressBar.style.width = '100%';
                if (progressDetail) progressDetail.innerText = `${fileName} (${(loaded/1024/1024).toFixed(1)}MB)`;
            }
        };

        const fetchWithProgress = (url, stepInfo) => {
            return new Promise((resolve, reject) => {
                const fileName = url.split('/').pop();
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.responseType = 'blob';

                xhr.onprogress = (event) => {
                    if (event.lengthComputable) {
                        updateProgress(event.loaded, event.total, fileName, stepInfo);
                    } else {
                        updateProgress(event.loaded, 0, fileName, stepInfo);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status === 200) {
                        const blob = xhr.response;
                        const objectURL = URL.createObjectURL(blob);
                        resolve(objectURL);
                    } else {
                        reject(new Error(`Failed to load ${url}: ${xhr.statusText}`));
                    }
                };

                xhr.onerror = () => {
                    reject(new Error(`Network error loading ${url}`));
                };

                xhr.send();
            });
        };

        try {
            // 预加载核心大文件，按顺序加载以展示清晰的进度
            // 1. WASM (引擎) ~1.8MB
            const wasmUrl = await fetchWithProgress('js/vendor/mediapipe/hands/hands_solution_simd_wasm_bin.wasm', '1/3');
            
            // 2. Data (资源) ~4MB
            const assetsDataUrl = await fetchWithProgress('js/vendor/mediapipe/hands/hands_solution_packed_assets.data', '2/3');
            
            // 3. TFLite (模型) ~5.6MB (Full) / ~2.9MB (Lite)
            // 根据 modelComplexity: 0，我们需要下载 lite 模型
            const tfliteUrl = await fetchWithProgress('js/vendor/mediapipe/hands/hand_landmark_lite.tflite', '3/3');

            this.hands = new window.Hands({locateFile: (file) => {
                if (file.endsWith('hands_solution_simd_wasm_bin.wasm')) return wasmUrl;
                if (file.endsWith('hands_solution_packed_assets.data')) return assetsDataUrl;
                if (file.endsWith('hand_landmark_lite.tflite')) return tfliteUrl;
                return `js/vendor/mediapipe/hands/${file}`;
            }});

            this.hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 0,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults(this.onResults.bind(this));
            
            // 预热模型（可选，但有助于第一次识别速度）
            await this.hands.initialize();
            console.log("MediaPipe Hands 模型加载完成");
        } catch (e) {
            console.error("MediaPipe Hands 初始化失败:", e);
            throw new Error("模型加载失败");
        }
    }

    async start() {
        console.log("正在请求摄像头权限...");
        this.gestureState.name = "Requesting Camera...";
        
        // 检查 HTTPS 环境（移动端强制要求）
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            alert("⚠️ 安全警告：\n浏览器要求必须使用 HTTPS 协议才能访问摄像头。\n\n请确保您的网址是以 https:// 开头的。");
        }

        try {
            // 针对移动端的配置优化
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            const constraints = {
                video: {
                    width: isMobile ? { ideal: 480 } : 320,
                    height: isMobile ? { ideal: 640 } : 240,
                    frameRate: { ideal: 30 },
                    // PC端不强制 facingMode，避免部分无前置摄像头的设备报错
                    facingMode: isMobile ? 'user' : undefined
                },
                audio: false
            };

            // 使用原生 API 获取视频流
            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            this.videoElement.srcObject = stream;
            // 确保视频自动播放（iOS 需要）
            this.videoElement.play();
            
            // 等待视频元数据加载完成
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    resolve();
                };
            });

            console.log("摄像头启动成功");
            this.gestureState.name = "Camera Active";
            
            // 开始处理循环
            this.processVideo();

        } catch (err) {
            console.error("摄像头启动失败:", err);
            this.gestureState.name = "Camera Error";
            
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                throw new Error("用户拒绝了摄像头权限");
            } else if (err.name === 'NotFoundError') {
                throw new Error("未找到摄像头设备");
            } else {
                throw new Error(`摄像头错误: ${err.message}`);
            }
        }
    }

    async processVideo() {
        if (!this.videoElement || this.videoElement.paused || this.videoElement.ended) {
            this.animationFrameId = requestAnimationFrame(this.processVideo.bind(this));
            return;
        }

        // 仅在视频帧更新时处理
        if (this.videoElement.currentTime !== this.lastVideoTime) {
            this.lastVideoTime = this.videoElement.currentTime;
            try {
                await this.hands.send({image: this.videoElement});
            } catch (e) {
                console.error("MediaPipe 处理错误:", e);
            }
        }

        this.animationFrameId = requestAnimationFrame(this.processVideo.bind(this));
    }

    stop() {
        if (this.videoElement && this.videoElement.srcObject) {
            const tracks = this.videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.videoElement.srcObject = null;
        }
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    onResults(results) {
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        // 绘制网格背景
        this.drawGrid(this.canvasCtx);
        
        // 绘制视频帧
        this.canvasCtx.globalAlpha = 0.6;
        this.canvasCtx.drawImage(results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);
        this.canvasCtx.globalAlpha = 1.0;

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            // 绘制所有检测到的手
            for (const landmarks of results.multiHandLandmarks) {
                window.drawConnectors(this.canvasCtx, landmarks, window.HAND_CONNECTIONS, {color: '#00FFFF', lineWidth: 2});
                window.drawLandmarks(this.canvasCtx, landmarks, {color: '#FF00FF', lineWidth: 1, radius: 2});
            }

            this.updateGestureState(results.multiHandLandmarks);
        } else {
            this.gestureState.isPresent = false;
            this.gestureState.handCount = 0;
            this.gestureState.name = 'Searching...';
        }
        this.canvasCtx.restore();
    }

    drawGrid(ctx) {
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        const w = this.canvasElement.width;
        const h = this.canvasElement.height;
        const step = 40;
        
        for(let x=0; x<=w; x+=step) {
            ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke();
        }
        for(let y=0; y<=h; y+=step) {
            ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
        }
    }

    updateGestureState(multiHandLandmarks) {
        this.gestureState.isPresent = true;
        this.gestureState.handCount = multiHandLandmarks.length;

        // 辅助函数: 计算手掌中心
        const getHandCenter = (landmarks) => {
            const wrist = landmarks[0];
            const middleMcp = landmarks[9];
            return {
                x: (wrist.x + middleMcp.x) / 2,
                y: (wrist.y + middleMcp.y) / 2
            };
        };

        // 辅助函数: 识别单手手势
        const analyzeHand = (landmarks) => {
            const wrist = landmarks[0];
            
            const isFingerExtended = (tipIdx, pipIdx) => {
                return this.calculateDistance(landmarks[tipIdx], wrist) > 
                       this.calculateDistance(landmarks[pipIdx], wrist) * 1.2;
            };

            const thumbExtended = this.calculateDistance(landmarks[4], wrist) > this.calculateDistance(landmarks[2], wrist) * 1.1;
            const indexExtended = isFingerExtended(8, 6);
            const middleExtended = isFingerExtended(12, 10);
            const ringExtended = isFingerExtended(16, 14);
            const pinkyExtended = isFingerExtended(20, 18);

            const thumbIndexDist = this.calculateDistance(landmarks[4], landmarks[8]);
            const isPinch = thumbIndexDist < 0.05;

            const isOk = isPinch && middleExtended && ringExtended && pinkyExtended;
            const isVictory = indexExtended && middleExtended && !ringExtended && !pinkyExtended;
            const isPointing = indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
            
            // Rock: Index & Pinky extended, Middle & Ring curled
            const isRock = indexExtended && pinkyExtended && !middleExtended && !ringExtended;

            // ThumbUp: Thumb extended, others curled
            const isThumbUp = thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;

            // 开合程度
            const tips = [4, 8, 12, 16, 20];
            let totalDist = 0;
            tips.forEach(idx => totalDist += this.calculateDistance(landmarks[idx], wrist));
            const avgDist = totalDist / 5;
            const openness = Math.min(Math.max((avgDist - 0.2) / 0.3, 0), 1);

            return { isOk, isVictory, isPointing, isRock, isThumbUp, openness, pinchDistance: Math.min(thumbIndexDist * 5, 1) };
        };

        if (this.gestureState.handCount === 1) {
            // === 单手模式 ===
            const landmarks = multiHandLandmarks[0];
            const center = getHandCenter(landmarks);
            const analysis = analyzeHand(landmarks);

            this.gestureState.position = center;
            this.gestureState.openness = analysis.openness;
            this.gestureState.pinchDistance = analysis.pinchDistance;
            this.gestureState.isOk = analysis.isOk;
            this.gestureState.isVictory = analysis.isVictory;
            this.gestureState.isRock = analysis.isRock;
            this.gestureState.isThumbUp = analysis.isThumbUp;
            
            // 双手属性重置
            this.gestureState.handsDistance = 0;
            this.gestureState.isNamaste = false;
            this.gestureState.isTriangle = false;

            // 状态名
            if (analysis.isOk) this.gestureState.name = "OK - Bagua";
            else if (analysis.isVictory) this.gestureState.name = "Victory - Dragon";
            else if (analysis.isRock) this.gestureState.name = "Rock - Lightning";
            else if (analysis.isThumbUp) this.gestureState.name = "ThumbUp - Fire";
            else if (analysis.isPointing) this.gestureState.name = "Pointing - Beam";
            else if (analysis.openness > 0.8) this.gestureState.name = "Open - Sword";
            else if (analysis.openness < 0.2) this.gestureState.name = "Closed - Blackhole";
            else this.gestureState.name = "Tracking (1 Hand)";

        } else if (this.gestureState.handCount === 2) {
            // === 双手模式 ===
            const hand1 = multiHandLandmarks[0];
            const hand2 = multiHandLandmarks[1];
            const center1 = getHandCenter(hand1);
            const center2 = getHandCenter(hand2);

            // 1. 双手中心
            this.gestureState.position = {
                x: (center1.x + center2.x) / 2,
                y: (center1.y + center2.y) / 2
            };

            // 2. 双手距离
            const dx = center1.x - center2.x;
            const dy = center1.y - center2.y;
            this.gestureState.handsDistance = Math.sqrt(dx*dx + dy*dy);

            // 3. 综合手势分析
            const a1 = analyzeHand(hand1);
            const a2 = analyzeHand(hand2);

            // 混合属性
            this.gestureState.openness = (a1.openness + a2.openness) / 2;
            this.gestureState.isOk = a1.isOk || a2.isOk;
            this.gestureState.isVictory = a1.isVictory || a2.isVictory;
            this.gestureState.isRock = a1.isRock || a2.isRock;
            this.gestureState.isThumbUp = a1.isThumbUp || a2.isThumbUp;
            
            // 双手特殊姿态判定
            // 合十: 距离近且都比较伸展(非握拳)
            this.gestureState.isNamaste = this.gestureState.handsDistance < 0.2 && this.gestureState.openness > 0.4;

            // 结印(三角形): 拇指对拇指，食指对食指
            // hand1[4] vs hand2[4], hand1[8] vs hand2[8]
            const thumbDist = this.calculateDistance(hand1[4], hand2[4]);
            const indexDist = this.calculateDistance(hand1[8], hand2[8]);
            this.gestureState.isTriangle = thumbDist < 0.1 && indexDist < 0.1 && this.gestureState.handsDistance < 0.3;

            // 状态名更新
            if (this.gestureState.isTriangle) {
                this.gestureState.name = "Triangle - Seal";
            } else if (this.gestureState.isNamaste) {
                this.gestureState.name = "Namaste - Shield";
            } else if (this.gestureState.handsDistance > 0.6) {
                this.gestureState.name = "Wide Open - Universe";
            } else if (this.gestureState.isVictory) {
                this.gestureState.name = "Dual/Single Dragon";
            } else if (this.gestureState.isRock) {
                this.gestureState.name = "Dual/Single Lightning";
            } else {
                this.gestureState.name = "Tracking (2 Hands)";
            }
        }
    }

    calculateDistance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    getGesture() {
        return this.gestureState;
    }
}
