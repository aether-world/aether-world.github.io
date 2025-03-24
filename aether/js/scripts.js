document.addEventListener('DOMContentLoaded', function() {
    // 视频控制
    // const video = document.getElementById('demoVideo');
    // video.addEventListener('ended', function() {
    //     this.currentTime = 0;
    //     this.play();
    // });

    const video = document.getElementById('demoVideo');
    
    // 确保视频自动播放
    function attemptAutoPlay() {
        video.play().catch(error => {
            // 如果自动播放被阻止，显示播放按钮
            const playButton = document.createElement('button');
            playButton.innerHTML = '点击播放视频';
            playButton.className = 'play-overlay';
            video.parentElement.appendChild(playButton);
            
            playButton.addEventListener('click', () => {
                video.play();
                playButton.remove();
            });
        });
    }
    
    // 处理Safari的自动播放限制
    if (video.readyState >= 3) {
        attemptAutoPlay();
    } else {
        video.addEventListener('loadedmetadata', attemptAutoPlay);
    }

    // // 平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // 添加滚动偏移补偿（导航栏高度）
    // document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    //     anchor.addEventListener('click', function(e) {
    //         e.preventDefault();
    //         const target = document.querySelector(this.getAttribute('href'));
    //         const offset = 80; // 导航栏高度
            
    //         window.scrollTo({
    //             top: target.offsetTop - offset,
    //             behavior: 'smooth'
    //         });
            
    //         // 添加临时class用于视觉反馈
    //         target.classList.add('highlight-target');
    //         setTimeout(() => target.classList.remove('highlight-target'), 1500);
    //     });
    // });

    // // 自动移除URL中的hash
    // window.addEventListener('hashchange', function() {
    //     history.replaceState(null, null, ' ');
    // });

    
});



class PointCloudViewer {
    constructor() {
        this.sequences = [
            // {
            //     thumbnail: 'assets/seq1_thumb.mp4',
            //     plyFiles: ['./assets/seq1/frame0.ply','./assets/seq1/frame0.ply','./assets/seq1/frame0.ply','./assets/seq1/frame0.ply','./assets/seq1/frame0.ply', './assets/seq1/frame2.ply']
            // },
            // {
            //     thumbnail: 'assets/seq1_thumb.mp4',
            //     plyFiles: ['./assets/seq1/frame0.ply', './assets/seq1/frame2.ply']
            // },
            // {
            //     thumbnail: 'assets/seq1_thumb.mp4',
            //     plyFiles: ['./assets/seq1/frame0.ply', './assets/seq1/frame2.ply']
            // },
            // {
            //     thumbnail: 'assets/seq1_thumb.mp4',
            //     plyFiles: ['./assets/seq1/frame0.ply', './assets/seq1/frame2.ply']
            // },

            {
                thumbnail: 'assets/seq2_thumb.mp4',
                plyFiles: [
                    './assets/seq2/frame1.ply', './assets/seq2/frame2.ply', './assets/seq2/frame3.ply', './assets/seq2/frame4.ply', './assets/seq2/frame5.ply', 
                    './assets/seq2/frame6.ply', './assets/seq2/frame7.ply', './assets/seq2/frame8.ply', './assets/seq2/frame9.ply', './assets/seq2/frame10.ply'
                ]
            },

            // 添加更多序列...
        ];
        
        this.initThreeJS();
        this.initUI();
        this.loadSequence(0);

        this.isInitialLoad = true; // 标志位，用于判断是否是第一次加载
    }

    initThreeJS() {
        // 初始化Three.js场景
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight-150);
        document.getElementById('viewport').appendChild(this.renderer.domElement);

        // 设置相机和灯光
        this.camera.position.z = 2; // 调整初始相机距离，使点云更合适
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        
        // 添加轨道控制器
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // 默认禁用滚轮缩放
        this.controls.enableZoom = false;
        
        // 添加提示元素 - 放在上方
        const zoomHint = document.createElement('div');
        zoomHint.className = 'zoom-hint';
        zoomHint.innerHTML = 'Hold Shift + Scroll to zoom'; // 英文提示
        zoomHint.style.display = 'none';
        document.getElementById('viewport').appendChild(zoomHint);
        
        // 监听键盘事件
        window.addEventListener('keydown', (e) => {
            if (e.shiftKey) {
                this.controls.enableZoom = true;
                zoomHint.style.display = 'block';
            }
        });
        
        window.addEventListener('keyup', (e) => {
            if (!e.shiftKey) {
                this.controls.enableZoom = false;
                zoomHint.style.display = 'none';
            }
        });

        // 鼠标进入viewport时显示提示
        document.getElementById('viewport').addEventListener('mouseenter', () => {
            zoomHint.style.display = 'block';
            setTimeout(() => {
                if (!this.controls.enableZoom) {
                    zoomHint.style.display = 'none';
                }
            }, 5000); // 5秒后自动隐藏提示
        });

        // 窗口大小变化处理
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / (window.innerHeight-150);
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight-150);
        });
    }

    initUI() {
        // 初始化序列缩略图
        const container = document.getElementById('sequenceThumbnails');
        this.sequences.forEach((seq, index) => {
            const thumb = document.createElement('div');
            thumb.className = 'sequence-thumbnail';
            // thumb.innerHTML = `<img src="${seq.thumbnail}">`;
            thumb.innerHTML = `<video src="${seq.thumbnail}" autoplay loop muted playsinline>`;   //<video id="demoVideo" ></video>
            thumb.onclick = () => this.loadSequence(index);
            container.appendChild(thumb);
        });

        // 时间轴控制
        document.getElementById('timeline').addEventListener('input', (e) => {
            const frame = parseInt(e.target.value);
            document.getElementById('timeLabel').textContent = `Frame: ${frame}`;
            this.loadFrame(frame);
        });
    }

    async loadSequence(index) {
        // 更新UI状态
        document.querySelectorAll('.sequence-thumbnail').forEach(t => 
            t.classList.remove('active'));
        document.querySelectorAll('.sequence-thumbnail')[index].classList.add('active');

        // 重置时间轴
        const timeline = document.getElementById('timeline');
        timeline.max = this.sequences[index].plyFiles.length - 1;
        timeline.value = 0;
        
        // 加载第一个帧
        this.currentSequence = index;
        this.isInitialLoad = true; // 标记为初始加载
        this.loadFrame(0);
    }

    async loadFrame(frame) {
        // 显示加载指示器
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = '<div class="spinner"></div><span>Loading point cloud...</span>';
        document.getElementById('viewport').appendChild(loadingIndicator);
        
        // 清除旧点云
        this.scene.children.slice().forEach(obj => {
            if(obj instanceof THREE.Points) this.scene.remove(obj);
        });

        // 加载新点云
        const loader = new THREE.PLYLoader();
        const url = this.sequences[this.currentSequence].plyFiles[frame];
        
        try {
            const geometry = await new Promise((resolve, reject) => {
                loader.load(url, resolve, undefined, reject);
            });

            // 移除加载指示器
            document.querySelector('.loading-indicator')?.remove();
            
            // 计算合适的点大小 - 减小点大小
            const bbox = new THREE.Box3().setFromBufferAttribute(
                geometry.attributes.position
            );
            const size = bbox.getSize(new THREE.Vector3()).length();
            const pointSize = Math.max(0.0005, size/1000); // 将点大小减小为原来的一半

            const material = new THREE.PointsMaterial({
                size: pointSize,
                vertexColors: geometry.hasAttribute('color'),
                sizeAttenuation: true,
                transparent: true,
                opacity: 0.9 // 
                // depthWrite: false // 改善点的渲染
            });
            
            const points = new THREE.Points(geometry, material);
            this.scene.add(points);

            if (this.isInitialLoad) {
                // 自动调整视角
                const center = bbox.getCenter(new THREE.Vector3());
                this.controls.target.copy(center);
                
                // 设置相机位置，使点云完全可见
                const maxDim = Math.max(
                    bbox.max.x - bbox.min.x,
                    bbox.max.y - bbox.min.y,
                    bbox.max.z - bbox.min.z
                );
                
                // 调整相机位置，使点云在视野中居中且大小合适
                this.camera.position.copy(center);
                this.camera.position.z += maxDim * 0.75; // 调整系数以获得合适的视图
                
                // 更新控制器
                this.controls.update();
                
                // 关闭初始加载标志
                this.isInitialLoad = false;
            }
            
            // 更新帧标签
            document.getElementById('timeLabel').textContent = `Frame: ${frame}`;
            
        } catch(error) {
            console.error('Failed to load PLY:', error);
            // 显示错误信息
            document.querySelector('.loading-indicator')?.remove();
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.innerHTML = 'Failed to load point cloud';
            document.getElementById('viewport').appendChild(errorMsg);
            setTimeout(() => errorMsg.remove(), 3000);
        }
    }
    // async loadFrame(frame) {
    //     try {
    //         // 显示加载状态
    //         document.getElementById('timeLabel').textContent = `Loading Frame ${frame}...`;
    
    //         // 清除旧点云
    //         while(this.scene.children.length > 0){ 
    //             this.scene.remove(this.scene.children[0]); 
    //         }
    
    //         // 重新添加光源
    //         this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    //         this.scene.add(new THREE.DirectionalLight(0xffffff, 0.5));
    
    //         const loader = new THREE.PLYLoader();
    //         const url = this.sequences[this.currentSequence].plyFiles[frame];
            
    //         const geometry = await new Promise((resolve, reject) => {
    //             loader.load(url, resolve, undefined, reject);
    //         });
    
    //         // 自动计算点大小
    //         const bbox = new THREE.Box3().setFromBufferAttribute(
    //             geometry.attributes.position
    //         );
    //         const size = bbox.getSize(new THREE.Vector3()).length();
    //         const pointSize = Math.max(0.01, size/1000);
    
    //         const material = new THREE.PointsMaterial({
    //             size: pointSize,
    //             vertexColors: true,
    //             transparent: true,
    //             opacity: 0.8
    //         });
    
    //         const points = new THREE.Points(geometry, material);
    //         this.scene.add(points);
    
    //         // 自动调整视角
    //         const center = bbox.getCenter(new THREE.Vector3());
    //         const maxDim = Math.max(size, 1);
            
    //         this.camera.position.copy(center)
    //             .add(new THREE.Vector3(maxDim, maxDim, maxDim));
    //         this.controls.target.copy(center);
    //         this.controls.update();
    
    //     } catch(error) {
    //         console.error('加载失败:', error);
    //         document.getElementById('timeLabel').textContent = `加载错误: ${error.message}`;
    //     }
    // }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// 初始化查看器
document.addEventListener('DOMContentLoaded', () => {
    const viewer = new PointCloudViewer();
    viewer.animate();
});