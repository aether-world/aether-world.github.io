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
            playButton.innerHTML = 'Click to Play';
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
            {
                thumbnail: 'assets/seq2_thumb.mp4',
                plyFiles: [
                    './assets/seq2/frame1.ply', './assets/seq2/frame2.ply', './assets/seq2/frame3.ply', './assets/seq2/frame4.ply', './assets/seq2/frame5.ply', 
                    './assets/seq2/frame6.ply', './assets/seq2/frame7.ply', './assets/seq2/frame8.ply', './assets/seq2/frame9.ply', './assets/seq2/frame10.ply'
                ]
            },
        ];
        
        this.initThreeJS();
        this.initUI();
        this.loadSequence(0);
        this.isInitialLoad = true;
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
        zoomHint.innerHTML = 'Left Mouse to rotate<br>'+ 'Hold Ctrl + Right Mouse to pan<br>' + 'Hold Shift + Scroll to zoom';
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
            
            thumb.style.width = '200px';
            thumb.style.height = '120px';
            
            // 创建视频元素
            const video = document.createElement('video');
            video.src = seq.thumbnail;
            video.muted = true;
            video.playsinline = true;
            video.loop = true;
            video.play().catch(err => console.error('Video play failed:', err));
            
            thumb.appendChild(video);
            thumb.onclick = () => this.loadSequence(index);
            container.appendChild(thumb);
        });

        // 时间轴控制
        const timeline = document.getElementById('timeline');
        timeline.addEventListener('input', () => {
            const frame = parseInt(timeline.value);
            this.loadFrame(frame);
            document.getElementById('timeLabel').textContent = `${frame}`;
        });

        // 添加左右导航区域
        const navButtons = document.createElement('div');
        navButtons.className = 'navigation-buttons';
        
        const prevButton = document.createElement('div');
        prevButton.className = 'nav-area prev';
        prevButton.innerHTML = '<div class="nav-arrow">&#10094;</div>';
        prevButton.addEventListener('click', () => {
            const timeline = document.getElementById('timeline');
            const currentFrame = parseInt(timeline.value);
            if (currentFrame > 0) {
                timeline.value = currentFrame - 1;
                this.loadFrame(currentFrame - 1);
                document.getElementById('timeLabel').textContent = `${currentFrame - 1}`;
            }
        });
        
        const nextButton = document.createElement('div');
        nextButton.className = 'nav-area next';
        nextButton.innerHTML = '<div class="nav-arrow">&#10095;</div>';
        nextButton.addEventListener('click', () => {
            const timeline = document.getElementById('timeline');
            const currentFrame = parseInt(timeline.value);
            const maxFrame = parseInt(timeline.max);
            if (currentFrame < maxFrame) {
                timeline.value = currentFrame + 1;
                this.loadFrame(currentFrame + 1);
                document.getElementById('timeLabel').textContent = `${currentFrame + 1}`;
            }
        });
        
        navButtons.appendChild(prevButton);
        navButtons.appendChild(nextButton);
        document.getElementById('viewport').appendChild(navButtons);
        
        // 添加键盘导航
        document.getElementById('viewport').tabIndex = 0;
        document.getElementById('viewport').addEventListener('keydown', (e) => {
            const timeline = document.getElementById('timeline');
            const currentFrame = parseInt(timeline.value);
            const maxFrame = parseInt(timeline.max);
            
            if (e.key === 'ArrowLeft' && currentFrame > 0) {
                timeline.value = currentFrame - 1;
                this.loadFrame(currentFrame - 1);
                document.getElementById('timeLabel').textContent = `${currentFrame - 1}`;
            } else if (e.key === 'ArrowRight' && currentFrame < maxFrame) {
                timeline.value = currentFrame + 1;
                this.loadFrame(currentFrame + 1);
                document.getElementById('timeLabel').textContent = `${currentFrame + 1}`;
            }
        });

        // 添加下采样注释
        const downsampleNote = document.createElement('div');
        downsampleNote.className = 'downsample-note';
        downsampleNote.innerHTML = 'Note: The point clouds are downsampled by a factor of 8 for faster loading.';
        document.getElementById('viewport').appendChild(downsampleNote);
    }

    loadSequence(index) {
        // 更新UI状态
        document.querySelectorAll('.sequence-thumbnail').forEach(t => 
            t.classList.remove('active'));
        document.querySelectorAll('.sequence-thumbnail')[index].classList.add('active');

        // 重置时间轴
        const timeline = document.getElementById('timeline');
        timeline.max = this.sequences[index].plyFiles.length - 1;
        timeline.value = 0;
        
        document.getElementById('timeLabel').textContent = '0';
        
        this.currentSequence = index;
        this.isInitialLoad = true;
        this.loadFrame(0);
    }

    async loadFrame(frame) {
        const url = this.sequences[this.currentSequence].plyFiles[frame];
        let geometry;
        let loadingIndicator;
        
        try {
            // 显示加载提示
            loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-indicator';
            loadingIndicator.innerHTML = '<div class="spinner"></div><span>Loading point cloud...</span>';
            document.getElementById('viewport').appendChild(loadingIndicator);
            
            // 加载PLY文件
            const loader = new THREE.PLYLoader();
            geometry = await new Promise((resolve, reject) => {
                loader.load(url, resolve, undefined, reject);
            });
            
            // 移除加载指示器
            loadingIndicator.remove();
            
            // 清除旧点云
            this.scene.children.slice().forEach(obj => {
                if(obj instanceof THREE.Points) this.scene.remove(obj);
            });
            
            // 计算合适的点大小
            const bbox = new THREE.Box3().setFromBufferAttribute(
                geometry.attributes.position
            );
            const size = bbox.getSize(new THREE.Vector3()).length();
            const pointSize = Math.max(0.0005, size/1000);

            const material = new THREE.PointsMaterial({
                size: pointSize,
                vertexColors: geometry.hasAttribute('color'),
                sizeAttenuation: true,
                transparent: true,
                opacity: 0.9
            });
            
            const points = new THREE.Points(geometry, material);
            
            // 添加淡入效果
            points.material.opacity = 0;
            this.scene.add(points);
            
            // 淡入动画
            const fadeIn = () => {
                if (points.material.opacity < 0.9) {
                    points.material.opacity += 0.05;
                    requestAnimationFrame(fadeIn);
                }
            };
            fadeIn();

            if (this.isInitialLoad) {
                // 自动调整视角
                const center = bbox.getCenter(new THREE.Vector3());
                this.controls.target.copy(center);
                
                const maxDim = Math.max(
                    bbox.max.x - bbox.min.x,
                    bbox.max.y - bbox.min.y,
                    bbox.max.z - bbox.min.z
                );
                
                this.camera.position.copy(center);
                this.camera.position.z += maxDim * 0.75;
                
                this.controls.update();
                this.isInitialLoad = false;
            }
            
        } catch(error) {
            console.error('Failed to load PLY:', error);
            loadingIndicator?.remove();
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.innerHTML = 'Failed to load point cloud';
            document.getElementById('viewport').appendChild(errorMsg);
            setTimeout(() => errorMsg.remove(), 3000);
        }
    }

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