


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
            {
                thumbnail: 'assets/seq1_thumb.mp4',
                plyFiles: ['./assets/seq1/frame0.ply','./assets/seq1/frame0.ply','./assets/seq1/frame0.ply','./assets/seq1/frame0.ply','./assets/seq1/frame0.ply', './assets/seq1/frame2.ply']
            },
            {
                thumbnail: 'assets/seq1_thumb.mp4',
                plyFiles: ['./assets/seq1/frame0.ply', './assets/seq1/frame2.ply']
            },
            {
                thumbnail: 'assets/seq1_thumb.mp4',
                plyFiles: ['./assets/seq1/frame0.ply', './assets/seq1/frame2.ply']
            },
            {
                thumbnail: 'assets/seq1_thumb.mp4',
                plyFiles: ['./assets/seq1/frame0.ply', './assets/seq1/frame2.ply']
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
        this.camera.position.z = 5;
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        
        // 添加轨道控制器
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

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

            const material = new THREE.PointsMaterial({
                size: 0.05,
                vertexColors: geometry.hasAttribute('color')
            });
            
            const points = new THREE.Points(geometry, material);
            this.scene.add(points);

            if (this.isInitialLoad) {
            
                // 自动调整视角
                // const box = new THREE.Box3().setFromObject(points);
                // const center = box.getCenter(new THREE.Vector3());
                // this.controls.target.copy(center);
                this.controls.target.set(0, 0, 0); // 将控制器的目标点设置为原点
                this.camera.position.copy(center).add(new THREE.Vector3(0,0,5));
                this.isInitialLoad = false; // 取消初始加载标志
            }
        } catch(error) {
            console.error('Failed to load PLY:', error);
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