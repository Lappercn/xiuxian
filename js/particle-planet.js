/**
 * 粒子星球特效模块 - 武侠修仙增强版
 * 基于 Three.js + PostProcessing
 * 
 * 风格调整:
 * - 配色: 青色(灵气)、金色(佛光)、紫色(魔气)、红色(杀意)、白色(剑意)
 * - 动态: 气旋、剑阵、黑洞、双龙、光柱、八卦
 * - 质感: 增强 Bloom，模拟真气流转
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class ParticlePlanet {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.particles = null;
        
        // 动画参数
        this.baseRotationSpeed = 0.002; 
        this.targetRotationSpeed = 0.002;
        this.rotationSpeed = 0.002;
        
        this.baseExpansion = 1.0;
        this.targetExpansion = 1.0;
        this.expansion = 1.0;
        
        // 修仙色系 - 更加精致、具有魔法感的配色
        this.colors = {
            cyan: new THREE.Color(0x00f2ff),   // 灵气 (Idle) - 亮青色
            gold: new THREE.Color(0xffd000),   // 佛光 (Open/Sword) - 纯金
            purple: new THREE.Color(0xd400ff), // 幻术 (Victory/Dragon) - 霓虹紫
            red: new THREE.Color(0xff3366),    // 杀意 (Closed/Blackhole) - 玫红/赤红
            white: new THREE.Color(0xe6f0ff),  // 纯净 (Pointing/Beam) - 冷白
            green: new THREE.Color(0x00ff99),   // 八卦 (OK/Bagua) - 荧光绿
            blue: new THREE.Color(0x0066ff),    // 雷引 (Rock/Lightning) - 电光蓝
            orange: new THREE.Color(0xff6600)   // 真火 (ThumbUp/Fire) - 炽热橙
        };
        
        this.currentColor = this.colors.cyan.clone();
        this.targetColor = this.colors.cyan.clone();

        // 粒子数据
        this.particleCount = 60000; // 增加粒子数量以提升细腻度
        
        // 各形态位置数据
        this.originalPositions = []; // Sphere (丹田)
        this.swordPositions = [];    // Sword (剑阵 - Open)
        this.blackholePositions = [];// Blackhole (黑洞 - Closed)
        this.dragonPositions = [];   // Dragon (双龙 - Victory)
        this.beamPositions = [];     // Beam (光柱 - Pointing)
        this.baguaPositions = [];    // Bagua (八卦 - OK)
        this.shieldPositions = [];   // Shield (金钟罩 - Namaste)
        this.universePositions = []; // Universe (开天辟地 - Wide Open)
        this.lightningPositions = [];// Lightning (雷引 - Rock)
        this.firePositions = [];     // Fire (真火 - ThumbUp)
        this.sealPositions = [];     // Seal (封印 - Triangle)
        
        this.particleSpeeds = [];
        this.particleSizes = [];
        
        // 形态控制
        this.morphTarget = 'sphere'; 
        this.lastOkState = false;

        // 位置跟随
        this.targetPosition = new THREE.Vector3(0, 0, 0);
        this.currentPosition = new THREE.Vector3(0, 0, 0);
        this.tiltX = 0;
        this.targetTiltX = 0;
        this.tiltZ = 0;
        this.targetTiltZ = 0;
        
        // 场景引用
        this.starfield = null;
        this.starfieldPositions = [];
        this.bloomPass = null;
    }

    init() {
        // 1. 场景
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x050510, 0.0015);

        // 2. 相机
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 4000);
        this.camera.position.z = 500;

        // 3. 渲染器
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        // 4. 后处理
        const renderScene = new RenderPass(this.scene, this.camera);
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
        this.bloomPass.threshold = 0.05;
        this.bloomPass.strength = 1.8;
        this.bloomPass.radius = 0.8;

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(this.bloomPass);

        // 5. 创建粒子系统
        this.createParticles();
        this.createStarfield();

        // 6. 监听窗口
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    createParticles() {
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const sizes = [];
        const color = new THREE.Color();

        // 剑阵参数
        const numSwords = 8; 

        for (let i = 0; i < this.particleCount; i++) {
            // ---------------------------
            // 1. Sphere (丹田气海 - Idle)
            // ---------------------------
            const r = 150 + Math.random() * 50;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);
            
            positions.push(x, y, z); // 默认位置
            this.originalPositions.push({x, y, z, r, theta, phi});

            // ---------------------------
            // 2. Sword Array (万剑归宗 - Open)
            // ---------------------------
            const swordIndex = i % numSwords;
            const swordAngle = (swordIndex / numSwords) * Math.PI * 2;
            const swordRadius = 200;
            
            const sy = (Math.random() - 0.5) * 400;
            let sx, sz;
            if (sy > 100) { 
                sx = (Math.random() - 0.5) * 10 * (200 - sy) / 100;
                sz = (Math.random() - 0.5) * 5;
            } else if (sy > -150) { 
                sx = (Math.random() - 0.5) * 30;
                sz = (Math.random() - 0.5) * 5;
            } else { 
                sx = (Math.random() - 0.5) * 80;
                sz = (Math.random() - 0.5) * 20;
            }
            const cosA = Math.cos(swordAngle);
            const sinA = Math.sin(swordAngle);
            this.swordPositions.push({
                x: swordRadius * cosA + sx * cosA - sz * sinA,
                y: sy,
                z: swordRadius * sinA + sx * sinA + sz * cosA,
                angle: swordAngle
            });

            // ---------------------------
            // 3. Black Hole (混沌黑洞 - Closed)
            // ---------------------------
            // 核心高密度，外围吸积盘
            let bhR, bhY;
            if (Math.random() < 0.3) { // 核心
                bhR = Math.random() * 40;
                bhY = (Math.random() - 0.5) * 40;
            } else { // 吸积盘
                bhR = 50 + Math.random() * 250;
                bhY = (Math.random() - 0.5) * (10 + bhR * 0.05); // 越远越厚
            }
            const bhTheta = Math.random() * Math.PI * 2;
            this.blackholePositions.push({
                x: bhR * Math.cos(bhTheta),
                y: bhY,
                z: bhR * Math.sin(bhTheta),
                r: bhR,
                theta: bhTheta
            });

            // ---------------------------
            // 4. Twin Dragons (双龙戏珠 - Victory)
            // ---------------------------
            // 两条螺旋上升的龙
            const dragonH = (Math.random() - 0.5) * 600; // 高度范围
            const isDragon1 = i % 2 === 0;
            const dragonR = 80 + Math.sin(dragonH * 0.02) * 30; // 身体粗细变化
            const dragonTwist = dragonH * 0.02 + (isDragon1 ? 0 : Math.PI); // 螺旋相位
            
            this.dragonPositions.push({
                x: dragonR * Math.cos(dragonTwist),
                y: dragonH,
                z: dragonR * Math.sin(dragonTwist),
                id: isDragon1 ? 1 : 2,
                h: dragonH
            });

            // ---------------------------
            // 5. Spirit Beam (通天光柱 - Pointing)
            // ---------------------------
            const beamR = Math.random() * 30; // 极细的光柱
            const beamY = (Math.random() - 0.5) * 1000; // 极高
            const beamTheta = Math.random() * Math.PI * 2;
            this.beamPositions.push({
                x: beamR * Math.cos(beamTheta),
                y: beamY,
                z: beamR * Math.sin(beamTheta)
            });

            // ---------------------------
            // 6. Bagua (八卦阵 - OK)
            // ---------------------------
            // 地面平铺八卦
            const baguaR = 20 + Math.random() * 300;
            const baguaTheta = Math.random() * Math.PI * 2;
            // 留出八个缝隙
            let isInGap = false;
            for(let k=0; k<8; k++) {
                const gapAngle = (k / 8) * Math.PI * 2;
                if (Math.abs(baguaTheta - gapAngle) < 0.05) isInGap = true;
            }
            
            this.baguaPositions.push({
                x: baguaR * Math.cos(baguaTheta),
                y: (Math.random() - 0.5) * 10, // 扁平
                z: baguaR * Math.sin(baguaTheta),
                visible: !isInGap
            });

            // ---------------------------
            // 7. Shield (金钟罩 - Namaste)
            // ---------------------------
            // 密集的球形护盾
            const shieldR = 120 + Math.random() * 5; // 厚度
            const shieldTheta = Math.random() * Math.PI * 2;
            const shieldPhi = Math.acos((Math.random() * 2) - 1);
            this.shieldPositions.push({
                x: shieldR * Math.sin(shieldPhi) * Math.cos(shieldTheta),
                y: shieldR * Math.sin(shieldPhi) * Math.sin(shieldTheta),
                z: shieldR * Math.cos(shieldPhi)
            });

            // ---------------------------
            // 8. Universe (开天辟地 - Wide Open)
            // ---------------------------
            // 巨大的螺旋星系
            const univR = Math.random() * 800; 
            // 对数螺旋
            const univAngle = Math.log(univR + 1) * 2 + (Math.random() * 0.5) + (i % 2) * Math.PI; 
            this.universePositions.push({
                x: univR * Math.cos(univAngle),
                y: (Math.random() - 0.5) * (univR * 0.2), // 中心厚，边缘薄
                z: univR * Math.sin(univAngle),
                angle: univAngle
            });

            // ---------------------------
            // 9. Lightning (九天雷引 - Rock)
            // ---------------------------
            // 核心球体 + 放射闪电
            let litX, litY, litZ;
            if (Math.random() < 0.7) {
                // 核心电浆
                const r = Math.random() * 60;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos((Math.random() * 2) - 1);
                litX = r * Math.sin(phi) * Math.cos(theta);
                litY = r * Math.sin(phi) * Math.sin(theta);
                litZ = r * Math.cos(phi);
            } else {
                // 闪电分支 (6条主分支)
                const branch = Math.floor(Math.random() * 6);
                const progress = Math.random(); // 0-1 沿分支距离
                const maxDist = 300;
                
                // 分支方向
                const branchPhi = (branch / 6) * Math.PI * 2;
                const branchTheta = (branch % 2 === 0 ? 1 : -1) * 0.5;
                
                const currentDist = progress * maxDist;
                // 添加锯齿抖动
                const jitter = 20;
                
                litX = currentDist * Math.cos(branchPhi) + (Math.random()-0.5)*jitter;
                litY = currentDist * Math.sin(branchTheta) + (Math.random()-0.5)*jitter;
                litZ = currentDist * Math.sin(branchPhi) + (Math.random()-0.5)*jitter;
            }
            this.lightningPositions.push({x: litX, y: litY, z: litZ});

            // ---------------------------
            // 10. Fire (三昧真火 - ThumbUp)
            // ---------------------------
            // 锥形火焰
            const fireH = (Math.random() * 400) - 200; // -200 to 200
            const progressH = (fireH + 200) / 400; // 0 to 1
            const maxR = (1 - progressH) * 120 + 10; // 底部宽，顶部窄
            const fireR = Math.random() * maxR;
            const fireTheta = Math.random() * Math.PI * 2;
            
            this.firePositions.push({
                x: fireR * Math.cos(fireTheta),
                y: fireH,
                z: fireR * Math.sin(fireTheta),
                baseY: fireH,
                speed: Math.random() * 5 + 2
            });

            // ---------------------------
            // 11. Seal (三角封印 - Triangle)
            // ---------------------------
            // 三角形平面
            const r1 = Math.random();
            const r2 = Math.random();
            const sqrtR1 = Math.sqrt(r1);
            const u = 1 - sqrtR1;
            const v = sqrtR1 * (1 - r2);
            const w = sqrtR1 * r2;
            
            // 顶点 (倒三角)
            const pA = {x: 0, y: -200};
            const pB = {x: 200, y: 150};
            const pC = {x: -200, y: 150};
            
            const sealX = u * pA.x + v * pB.x + w * pC.x;
            const sealY = u * pA.y + v * pB.y + w * pC.y;
            const sealZ = (Math.random() - 0.5) * 10; // 薄片
            
            this.sealPositions.push({x: sealX, y: sealY, z: sealZ});


            // 通用属性
            this.particleSpeeds.push(Math.random() * 0.02 + 0.005);
            
            color.copy(this.colors.cyan);
            const l = 0.5 + Math.random() * 0.5;
            colors.push(color.r * l, color.g * l, color.b * l);
            
            const size = Math.random() * 2.0 + 0.5;
            sizes.push(size);
            this.particleSizes.push(size);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

        const sprite = this.generateSprite();

        const material = new THREE.PointsMaterial({
            size: 5, // 稍微减小基础尺寸，因为数量多了
            map: sprite,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true,
            opacity: 0.7, // 降低透明度以获得更细腻的叠加
            sizeAttenuation: true
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    createStarfield() {
        const geometry = new THREE.BufferGeometry();
        const count = 3000;
        const positions = [];
        const colors = [];
        
        for(let i=0; i<count; i++) {
            const r = 1000 + Math.random() * 1000;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);
            
            positions.push(x, y, z);
            
            // 保存原始位置用于动画
            this.starfieldPositions.push({x, y, z, r, theta, phi});

            const c = new THREE.Color(0x222244).lerp(new THREE.Color(0x000000), Math.random());
            colors.push(c.r, c.g, c.b);
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        const material = new THREE.PointsMaterial({
            size: 3,
            vertexColors: true,
            transparent: true,
            opacity: 0.5,
            sizeAttenuation: false
        });
        
        this.starfield = new THREE.Points(geometry, material);
        this.scene.add(this.starfield);
    }

    generateSprite() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        
        // 核心光点 - 增强中心亮度
        const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.1, 'rgba(255, 255, 255, 1)'); // 扩大实心核心
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 128, 128);
        
        // 添加十字星芒效果
        context.globalCompositeOperation = 'source-over';
        const starGradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
        starGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        starGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        context.fillStyle = starGradient;
        
        // 横向光芒
        context.fillRect(32, 62, 64, 4);
        // 纵向光芒
        context.fillRect(62, 32, 4, 64);

        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    update(gestureData) {
        const time = Date.now() * 0.001;
        const statusBar = document.querySelector('#status-bar span');
        if (statusBar) statusBar.innerText = gestureData.name;

        // 1. 手势逻辑 -> 状态机
        let targetColor = this.colors.cyan;
        let turbulence = 0.5; 
        let rotationSpeedAdd = 0;
        
        // 环境参数
        let targetFogColor = new THREE.Color(0x050510);
        let targetFogDensity = 0.0015;
        let targetBloomStrength = 1.6; // 稍微降低默认强度，避免过曝
        let targetBloomRadius = 0.6;
        let starfieldMode = 'idle';

        if (gestureData.isPresent) {
            // ------------------
            // 状态判断与切换
            // ------------------
            
            // Victory -> 双龙 (Purple)
            if (gestureData.isVictory) {
                this.morphTarget = 'dragon';
                targetColor = this.colors.purple;
                turbulence = 2.0;
                this.targetExpansion = 1.0;
                rotationSpeedAdd = 0.01;
                
                targetFogColor.setHex(0x1a0022); // 紫雾
                targetBloomStrength = 2.5;
                starfieldMode = 'twist';
            } 
            // Closed -> 黑洞 (Red)
            else if (gestureData.name.includes('Closed')) {
                this.morphTarget = 'blackhole';
                targetColor = this.colors.red;
                this.targetExpansion = 0.8; 
                turbulence = 3.0; 
                rotationSpeedAdd = 0.05; // 极速吸入
                
                targetFogColor.setHex(0x110000); // 血雾
                targetFogDensity = 0.003; // 浓雾
                targetBloomStrength = 3.0;
                targetBloomRadius = 1.2; // 扩散
                starfieldMode = 'suck';
            }
            // Open -> 剑阵 (Gold)
            else if (gestureData.name.includes('Open')) {
                this.morphTarget = 'sword';
                targetColor = this.colors.gold;
                this.targetExpansion = 1.0; 
                turbulence = 0.2; 
                rotationSpeedAdd = 0.005;
                
                targetFogColor.setHex(0x221100); // 金辉
                targetBloomStrength = 2.0;
                starfieldMode = 'warp';
            }
            // Pointing -> 光柱 (White)
            else if (gestureData.name.includes('Pointing')) {
                this.morphTarget = 'beam';
                targetColor = this.colors.white;
                this.targetExpansion = 1.0;
                turbulence = 0.5;
                rotationSpeedAdd = 0.0; // 光柱不转
                
                targetFogColor.setHex(0x111111); // 纯净
                targetBloomStrength = 2.2;
                starfieldMode = 'rise';
            }
            // OK -> 八卦 (Green/Cyan)
            else if (gestureData.isOk) {
                this.morphTarget = 'bagua';
                targetColor = this.colors.green;
                this.targetExpansion = 1.2;
                turbulence = 0.1; // 极静
                rotationSpeedAdd = -0.001; // 反向慢转
                
                targetFogColor.setHex(0x001105); // 清幽
                targetBloomStrength = 1.5;
                starfieldMode = 'static';
            }
            // Namaste -> 金钟罩 (Gold)
            else if (gestureData.isNamaste) {
                this.morphTarget = 'shield';
                targetColor = this.colors.gold;
                this.targetExpansion = 1.0;
                turbulence = 0.05; // 极稳
                rotationSpeedAdd = 0.05; // 快速旋转的护盾
                
                targetFogColor.setHex(0x222200); // 佛光
                targetBloomStrength = 2.0;
                starfieldMode = 'rotate';
            }
            // Wide Open -> 宇宙 (Purple)
            else if (gestureData.name.includes('Universe')) {
                this.morphTarget = 'universe';
                targetColor = this.colors.purple;
                this.targetExpansion = 1.0;
                turbulence = 1.0;
                rotationSpeedAdd = 0.002;
                
                targetFogColor.setHex(0x0a001a); // 深空
                targetBloomStrength = 2.8;
                starfieldMode = 'spiral';
            }
            // Rock -> 雷引 (Blue)
            else if (gestureData.isRock) {
                this.morphTarget = 'lightning';
                targetColor = this.colors.blue;
                this.targetExpansion = 1.1;
                turbulence = 4.0; // 剧烈
                rotationSpeedAdd = 0.0;
                
                targetFogColor.setHex(0x000022); // 雷云
                targetFogDensity = 0.0025;
                targetBloomStrength = 3.5; // 极亮
                starfieldMode = 'flash';
            }
            // ThumbUp -> 真火 (Orange)
            else if (gestureData.isThumbUp) {
                this.morphTarget = 'fire';
                targetColor = this.colors.orange;
                this.targetExpansion = 1.0;
                turbulence = 1.5;
                rotationSpeedAdd = 0.005;
                
                targetFogColor.setHex(0x220500); // 火光
                targetBloomStrength = 2.5;
                starfieldMode = 'heat';
            }
            // Triangle -> 封印 (Gold)
            else if (gestureData.isTriangle) {
                this.morphTarget = 'seal';
                targetColor = this.colors.cyan; // 符文多为青色/金色
                this.targetExpansion = 1.2;
                turbulence = 0.1;
                rotationSpeedAdd = 0.0; // 不转
                
                targetFogColor.setHex(0x001111); 
                targetBloomStrength = 2.0;
                starfieldMode = 'static';
            }
            else {
                // 其他手势 -> 归元
                this.morphTarget = 'sphere';
                this.targetExpansion = 1.0 + gestureData.openness;
            }

            // 位置跟随逻辑
            const rangeX = 600; 
            const rangeY = 350;
            // 镜像修正: 摄像头通常是镜像的，如果手往右(屏幕右边)，希望物体也往右
            const tx = (gestureData.position.x - 0.5) * 2 * rangeX;
            const ty = -(gestureData.position.y - 0.5) * 2 * rangeY;
            this.targetPosition.set(tx, ty, 0);
            this.targetTiltX = (gestureData.position.y - 0.5) * 0.6;
            this.targetTiltZ = -(gestureData.position.x - 0.5) * 0.4;

        } else {
            // 无手势 -> 归元
            this.morphTarget = 'sphere';
            this.targetExpansion = 1.0;
            targetColor = this.colors.cyan;
            
            // 归位
            this.targetPosition.set(0, 0, 0);
            this.targetTiltX = 0;
            this.targetTiltZ = 0;
        }

        // 2. 参数平滑过渡
        this.currentColor.lerp(targetColor, 0.05);
        this.expansion += (this.targetExpansion - this.expansion) * 0.08;
        
        // 环境参数过渡
        this.scene.fog.color.lerp(targetFogColor, 0.02);
        this.scene.fog.density += (targetFogDensity - this.scene.fog.density) * 0.02;
        
        if (this.bloomPass) {
            this.bloomPass.strength += (targetBloomStrength - this.bloomPass.strength) * 0.05;
            this.bloomPass.radius += (targetBloomRadius - this.bloomPass.radius) * 0.05;
        }

        // 背景星空动画
        if (this.starfield && this.starfieldPositions.length > 0) {
            const positions = this.starfield.geometry.attributes.position.array;
            for(let i=0; i<this.starfieldPositions.length; i++) {
                const i3 = i * 3;
                const orig = this.starfieldPositions[i];
                let tx = orig.x, ty = orig.y, tz = orig.z;

                if (starfieldMode === 'idle') {
                    // 缓慢漂浮
                    const rot = time * 0.05;
                    tx = orig.x * Math.cos(rot) - orig.z * Math.sin(rot);
                    tz = orig.x * Math.sin(rot) + orig.z * Math.cos(rot);
                } else if (starfieldMode === 'warp') {
                    // 剑阵：极速后退拉伸
                    tz = (orig.z + time * 5000) % 4000 - 2000;
                    tx = orig.x; ty = orig.y;
                } else if (starfieldMode === 'suck') {
                    // 黑洞：螺旋吸入
                    const r = orig.r * (0.5 + Math.sin(time * 0.5 + i)*0.2);
                    const rot = time * 2 + 1000/r;
                    tx = r * Math.cos(rot + orig.theta);
                    tz = r * Math.sin(rot + orig.theta);
                    ty = orig.y * (r/orig.r); 
                } else if (starfieldMode === 'twist') {
                    // 双龙：空间扭曲
                    const angle = orig.y * 0.002 + time;
                    tx = orig.x * Math.cos(angle) - orig.z * Math.sin(angle);
                    tz = orig.x * Math.sin(angle) + orig.z * Math.cos(angle);
                } else if (starfieldMode === 'rise') {
                    // 光柱：上升流
                    ty = (orig.y + time * 1000) % 4000 - 2000;
                } else if (starfieldMode === 'rotate') {
                    // 金钟罩：整体旋转
                    const rot = time * 0.2;
                    tx = orig.x * Math.cos(rot) - orig.z * Math.sin(rot);
                    tz = orig.x * Math.sin(rot) + orig.z * Math.cos(rot);
                } else if (starfieldMode === 'spiral') {
                    // 宇宙：星系旋臂
                    const r = Math.sqrt(orig.x*orig.x + orig.z*orig.z);
                    const rot = time * 0.1 * (2000/r);
                    tx = orig.x * Math.cos(rot) - orig.z * Math.sin(rot);
                    tz = orig.x * Math.sin(rot) + orig.z * Math.cos(rot);
                } else if (starfieldMode === 'flash') {
                    // 雷引：背景星空闪烁
                    if (Math.random() < 0.05) {
                        tx += (Math.random()-0.5)*100;
                        ty += (Math.random()-0.5)*100;
                        tz += (Math.random()-0.5)*100;
                    }
                } else if (starfieldMode === 'heat') {
                    // 真火：热浪上升
                    ty = (orig.y + time * 200) % 4000 - 2000;
                    tx = orig.x + Math.sin(ty * 0.01 + time * 5) * 20;
                } else if (starfieldMode === 'static') {
                    // 封印：静止或极慢
                     const rot = time * 0.01;
                    tx = orig.x * Math.cos(rot) - orig.z * Math.sin(rot);
                    tz = orig.x * Math.sin(rot) + orig.z * Math.cos(rot);
                }

                positions[i3] = tx;
                positions[i3+1] = ty;
                positions[i3+2] = tz;
            }
            this.starfield.geometry.attributes.position.needsUpdate = true;
        }
        
        // 位置与倾斜更新
        this.currentPosition.lerp(this.targetPosition, 0.08);
        this.particles.position.copy(this.currentPosition);
        
        this.tiltX += (this.targetTiltX - this.tiltX) * 0.05;
        this.particles.rotation.x = this.tiltX;
        
        this.tiltZ += (this.targetTiltZ - this.tiltZ) * 0.05;
        
        // 3. 粒子更新
        const positions = this.particles.geometry.attributes.position.array;
        const colors = this.particles.geometry.attributes.color.array;
        const sizes = this.particles.geometry.attributes.size.array;
        
        // 根据不同形态设定 Lerp 速度
        let lerpFactor = 0.08;
        if (this.morphTarget === 'sword' || this.morphTarget === 'beam') lerpFactor = 0.15;
        if (this.morphTarget === 'blackhole') lerpFactor = 0.05; // 吸入慢一点
        if (this.morphTarget === 'lightning') lerpFactor = 0.25;

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            let tx, ty, tz;
            
            // ------------------
            // 形态位置计算
            // ------------------
            if (this.morphTarget === 'sphere') {
                const orig = this.originalPositions[i];
                const pulse = Math.sin(time * 2 + orig.r * 0.05) * 10 * turbulence; 
                const currentR = (orig.r * this.expansion) + pulse;
                const spiralOffset = Math.sin(time + orig.y * 0.01) * 10 * turbulence;
                tx = currentR * Math.sin(orig.phi) * Math.cos(orig.theta + spiralOffset * 0.01);
                ty = currentR * Math.sin(orig.phi) * Math.sin(orig.theta + spiralOffset * 0.01);
                tz = currentR * Math.cos(orig.phi);

            } else if (this.morphTarget === 'sword') {
                const sword = this.swordPositions[i];
                const currentAngle = sword.angle + time * 0.5; 
                const r = Math.sqrt(sword.x * sword.x + sword.z * sword.z);
                const initAngle = Math.atan2(sword.z, sword.x);
                const finalAngle = initAngle + time * 0.5; 
                tx = r * Math.cos(finalAngle) * this.expansion;
                ty = sword.y * this.expansion + Math.sin(time * 5 + i) * 5; 
                tz = r * Math.sin(finalAngle) * this.expansion;

            } else if (this.morphTarget === 'blackhole') {
                const bh = this.blackholePositions[i];
                // 核心旋转极快，外围稍慢
                const angleSpeed = 5.0 / (0.1 + bh.r * 0.01); 
                const currentTheta = bh.theta + time * angleSpeed;
                // 吸入效果：半径收缩
                const r = bh.r * this.expansion * (0.8 + Math.sin(time * 10 + i)*0.1);
                tx = r * Math.cos(currentTheta);
                ty = bh.y * this.expansion;
                tz = r * Math.sin(currentTheta);
                // 粒子抖动
                if(r < 50) { tx += (Math.random()-0.5)*10; ty += (Math.random()-0.5)*10; tz += (Math.random()-0.5)*10; }

            } else if (this.morphTarget === 'dragon') {
                const dg = this.dragonPositions[i];
                // 龙游动
                const moveY = (dg.h + time * 100) % 600 - 300; 
                // 龙身扭动
                const twist = moveY * 0.02 + (dg.id === 1 ? 0 : Math.PI) + time;
                const r = 80 + Math.sin(moveY * 0.05) * 20;
                tx = r * Math.cos(twist) * this.expansion;
                ty = moveY * this.expansion;
                tz = r * Math.sin(twist) * this.expansion;

            } else if (this.morphTarget === 'beam') {
                const bm = this.beamPositions[i];
                // 光柱能量向上流动
                const flowY = (bm.y + time * 500) % 1000 - 500;
                tx = bm.x * this.expansion;
                ty = flowY * this.expansion;
                tz = bm.z * this.expansion;
                // 能量波动
                const wave = Math.sin(flowY * 0.1 + time * 10) * 5;
                tx += wave; tz += wave;

            } else if (this.morphTarget === 'bagua') {
                const bg = this.baguaPositions[i];
                if (!bg.visible) {
                    // 缝隙中的粒子飞到上方形成光幕
                    tx = bg.x * this.expansion;
                    ty = bg.y + 200 + Math.sin(time+i)*20;
                    tz = bg.z * this.expansion;
                } else {
                    // 缓慢旋转
                    const rot = time * 0.2;
                    const cosR = Math.cos(rot);
                    const sinR = Math.sin(rot);
                    tx = (bg.x * cosR - bg.z * sinR) * this.expansion;
                    ty = bg.y * this.expansion;
                    tz = (bg.x * sinR + bg.z * cosR) * this.expansion;
                }

            } else if (this.morphTarget === 'shield') {
                const sh = this.shieldPositions[i];
                // 护盾旋转
                const rot = time * 2;
                const cosR = Math.cos(rot);
                const sinR = Math.sin(rot);
                tx = (sh.x * cosR - sh.z * sinR) * this.expansion;
                ty = sh.y * this.expansion;
                tz = (sh.x * sinR + sh.z * cosR) * this.expansion;
                // 呼吸效果
                const pulse = 1.0 + Math.sin(time * 5) * 0.02;
                tx *= pulse; ty *= pulse; tz *= pulse;

            } else if (this.morphTarget === 'universe') {
                const uv = this.universePositions[i];
                // 星系旋转 - 差速
                const dist = Math.sqrt(uv.x*uv.x + uv.z*uv.z);
                const rot = time * 0.5 / (1 + dist * 0.005); 
                const cosR = Math.cos(rot);
                const sinR = Math.sin(rot);
                tx = (uv.x * cosR - uv.z * sinR) * this.expansion;
                ty = uv.y * this.expansion;
                tz = (uv.x * sinR + uv.z * cosR) * this.expansion;

            } else if (this.morphTarget === 'lightning') {
                const lit = this.lightningPositions[i];
                const jitter = (Math.random() - 0.5) * 10 * turbulence;
                tx = lit.x * this.expansion + jitter;
                ty = lit.y * this.expansion + jitter;
                tz = lit.z * this.expansion + jitter;
                // 闪烁效果：偶尔飞很远
                if (Math.random() < 0.01) {
                    tx *= 1.5; ty *= 1.5; tz *= 1.5;
                }

            } else if (this.morphTarget === 'fire') {
                const fire = this.firePositions[i];
                const flow = (time * fire.speed * 20) % 400;
                let curY = fire.baseY + flow;
                if (curY > 200) curY -= 400;
                
                // 计算当前高度的最大半径
                const progress = (curY + 200) / 400;
                const currentMaxR = (1 - progress) * 120 + 10;
                
                // 原始比例
                const origProgress = (fire.baseY + 200) / 400;
                const origMaxR = (1 - origProgress) * 120 + 10;
                const r0 = Math.sqrt(fire.x*fire.x + fire.z*fire.z);
                const ratio = r0 / origMaxR;
                
                const r = ratio * currentMaxR;
                const angle = Math.atan2(fire.z, fire.x);
                
                tx = r * Math.cos(angle) * this.expansion;
                ty = curY * this.expansion;
                tz = r * Math.sin(angle) * this.expansion;
                
                // 摇曳
                tx += Math.sin(time * 5 + curY * 0.05) * 5;
                tz += Math.cos(time * 5 + curY * 0.05) * 5;

            } else if (this.morphTarget === 'seal') {
                const sl = this.sealPositions[i];
                const rot = time * 0.5;
                const cosR = Math.cos(rot);
                const sinR = Math.sin(rot);
                // 绕Z轴旋转 (在XY平面)
                tx = (sl.x * cosR - sl.y * sinR) * this.expansion;
                ty = (sl.x * sinR + sl.y * cosR) * this.expansion;
                tz = sl.z * this.expansion;
            }
            
            // 粒子位置更新
            positions[i3] += (tx - positions[i3]) * lerpFactor;
            positions[i3+1] += (ty - positions[i3+1]) * lerpFactor;
            positions[i3+2] += (tz - positions[i3+2]) * lerpFactor;

            // 颜色更新
            const flicker = 0.8 + Math.sin(time * 10 + i) * 0.2;
            colors[i3] = this.currentColor.r * flicker;
            colors[i3+1] = this.currentColor.g * flicker;
            colors[i3+2] = this.currentColor.b * flicker;
            
            // 大小更新
            let sizeMult = 1.0;
            if (turbulence > 1.0) sizeMult = 1.5;
            if (this.morphTarget === 'blackhole' && i % 5 === 0) sizeMult = 2.0; // 黑洞中有大颗粒
            sizes[i] = this.particleSizes[i] * sizeMult;
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.geometry.attributes.color.needsUpdate = true;
        this.particles.geometry.attributes.size.needsUpdate = true;

        // 整体旋转
        if (this.morphTarget !== 'beam') { // 光柱不整体转
            this.particles.rotation.y += (this.baseRotationSpeed + rotationSpeedAdd);
        }
        
        this.particles.rotation.z = Math.sin(time * 0.5) * 0.1 + this.tiltZ;

        this.composer.render();
    }

    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }
}
