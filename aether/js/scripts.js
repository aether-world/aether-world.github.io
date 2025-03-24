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

        // 预加载所有视频缩略图
        this.preloadThumbnails();

        // 初始化预加载状态
        this.preloadStatus = {
            cache: {}, // 缓存已加载的几何体
            loading: {}, // 正在加载的请求
            queue: [], // 加载队列
            maxConcurrent: 4, // 最大并发加载数
            currentLoading: 0, // 当前正在加载的数量
            maxCacheSize: 20 // 最大缓存帧数
        };
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
            
            // 设置固定尺寸，与视频最终尺寸一致
            thumb.style.width = '200px';
            thumb.style.height = '120px';
            
            // 创建加载指示器
            const thumbLoader = document.createElement('div');
            thumbLoader.className = 'thumb-loader';
            thumbLoader.innerHTML = '<div class="thumb-spinner"></div><span>Loading...</span>';
            thumb.appendChild(thumbLoader);
            
            // 创建模糊的预览图（可以是视频第一帧的静态图像）
            const previewImg = document.createElement('div');
            previewImg.className = 'thumb-preview';
            // 设置默认背景色，避免白屏
            previewImg.style.backgroundColor = '#1a1a1a';
            
            // 如果有预览图，则设置
            if (seq.thumbnailPreview) {
                const img = new Image();
                img.onload = () => {
                    previewImg.style.backgroundImage = `url(${seq.thumbnailPreview})`;
                    previewImg.style.filter = 'blur(5px)';
                };
                img.src = seq.thumbnailPreview;
            } else {
                // 没有预览图时，显示序列号
                const placeholderText = document.createElement('div');
                placeholderText.className = 'placeholder-text';
                placeholderText.textContent = `Sequence ${index + 1}`;
                previewImg.appendChild(placeholderText);
            }
            
            thumb.appendChild(previewImg);
            
            // 创建视频元素
            const video = document.createElement('video');
            video.muted = true;
            video.playsinline = true;
            video.style.opacity = '0'; // 初始隐藏视频
            
            // 在视频元素创建后添加进度条
            const progressBar = document.createElement('div');
            progressBar.className = 'video-progress';
            progressBar.innerHTML = '<div class="progress-fill"></div>';
            thumb.appendChild(progressBar);
            
            // 监听视频加载进度
            video.addEventListener('progress', () => {
                if (video.buffered.length > 0) {
                    const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                    const duration = video.duration;
                    const progress = (bufferedEnd / duration) * 100;
                    progressBar.querySelector('.progress-fill').style.width = `${progress}%`;
                    
                    // 更新加载文本
                    thumbLoader.querySelector('span').textContent = `${Math.round(progress)}% loaded`;
                }
            });
            
            // 视频开始加载
            let loadStarted = false;
            
            // 视频开始加载
            video.addEventListener('loadstart', () => {
                loadStarted = true;
                thumbLoader.querySelector('span').textContent = 'Loading...';
            });
            
            // 视频元数据加载完成
            video.addEventListener('loadedmetadata', () => {
                if (loadStarted) {
                    thumbLoader.querySelector('span').textContent = 'Buffering...';
                }
            });
            
            // 视频可以播放（至少缓冲了一部分）
            video.addEventListener('canplay', () => {
                if (loadStarted) {
                    thumbLoader.querySelector('span').textContent = 'Ready to play';
                }
            });
            
            // 视频完全加载完成
            video.addEventListener('canplaythrough', () => {
                // 淡出加载指示器
                thumbLoader.style.opacity = '0';
                setTimeout(() => {
                    thumbLoader.style.display = 'none';
                }, 500);
                
                // 淡入视频
                video.style.opacity = '1';
                
                // 淡出预览图
                previewImg.style.opacity = '0';
                
                // 开始播放视频
                video.play().catch(err => console.error('Video play failed:', err));
                video.loop = true;
            });
            
            // 视频加载失败处理
            video.addEventListener('error', () => {
                thumbLoader.innerHTML = '<div class="thumb-error">Error</div>';
                console.error('Video load error:', video.error);
            });
            
            // 设置视频源（放在事件监听器之后）
            video.src = seq.thumbnail;
            
            thumb.appendChild(video);
            thumb.onclick = () => this.loadSequence(index);
            container.appendChild(thumb);
        });

        // 时间轴控制
        const timeline = document.getElementById('timeline');
        timeline.addEventListener('input', () => {
            const frame = parseInt(timeline.value);
            this.loadFrame(frame);
            // 更新帧标签 - 只显示帧号
            document.getElementById('timeLabel').textContent = `${frame}`;
        });

        // 添加左右导航区域
        const navButtons = document.createElement('div');
        navButtons.className = 'navigation-buttons';
        
        const prevButton = document.createElement('div'); // 改为div以便更灵活地控制样式
        prevButton.className = 'nav-area prev';
        prevButton.innerHTML = '<div class="nav-arrow">&#10094;</div>'; // 箭头放在内部div中
        prevButton.addEventListener('click', () => {
            const timeline = document.getElementById('timeline');
            const currentFrame = parseInt(timeline.value);
            if (currentFrame > 0) {
                timeline.value = currentFrame - 1;
                this.loadFrame(currentFrame - 1);
                // 更新帧标签 - 只显示帧号
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
                // 更新帧标签 - 只显示帧号
                document.getElementById('timeLabel').textContent = `${currentFrame + 1}`;
            }
        });
        
        navButtons.appendChild(prevButton);
        navButtons.appendChild(nextButton);
        document.getElementById('viewport').appendChild(navButtons);
        
        // 添加键盘导航
        document.getElementById('viewport').tabIndex = 0; // 使viewport可聚焦
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

    async loadSequence(index) {
        // 更新UI状态
        document.querySelectorAll('.sequence-thumbnail').forEach(t => 
            t.classList.remove('active'));
        document.querySelectorAll('.sequence-thumbnail')[index].classList.add('active');

        // 重置时间轴
        const timeline = document.getElementById('timeline');
        timeline.max = this.sequences[index].plyFiles.length - 1;
        timeline.value = 0;
        
        // 更新帧标签 - 只显示帧号
        document.getElementById('timeLabel').textContent = '0';
        
        // 加载第一个帧
        this.currentSequence = index;
        this.isInitialLoad = true; // 标记为初始加载
        this.loadFrame(0);
        
        // 开始预加载其他帧
        this.preloadPointClouds(index);
    }

    preloadPointClouds(sequenceIndex) {
        // 创建预加载状态对象
        if (!this.preloadStatus) {
            this.preloadStatus = {
                cache: {}, // 缓存已加载的几何体
                loading: {}, // 正在加载的请求
                queue: [], // 加载队列
                maxConcurrent: 2, // 最大并发加载数
                currentLoading: 0, // 当前正在加载的数量
                maxCacheSize: 20 // 最大缓存帧数
            };
        }
        
        // 清除之前的预加载队列
        this.preloadStatus.queue = [];
        
        // 获取当前序列的所有PLY文件
        const files = this.sequences[sequenceIndex].plyFiles;
        
        // 创建预加载状态指示器
        const preloadIndicator = document.createElement('div');
        preloadIndicator.className = 'preload-indicator';
        preloadIndicator.innerHTML = 'Preloading: 0%';
        document.getElementById('viewport').appendChild(preloadIndicator);
        
        // 获取当前帧和方向
        const currentFrame = parseInt(document.getElementById('timeline').value);
        const direction = this.lastFrame < currentFrame ? 1 : -1;
        this.lastFrame = currentFrame;
        
        // 优先加载用户可能查看的下一帧（根据当前浏览方向）
        const priorityQueue = [];
        
        // 首先添加前后几帧（优先考虑当前方向）
        for (let offset = 1; offset <= 5; offset++) {
            // 向当前方向添加帧
            const nextFrame = currentFrame + (offset * direction);
            if (nextFrame >= 0 && nextFrame < files.length) {
                priorityQueue.push({
                    frame: nextFrame,
                    priority: 1,
                    url: files[nextFrame]
                });
            }
            
            // 向相反方向添加帧（较低优先级）
            const prevFrame = currentFrame - (offset * direction);
            if (prevFrame >= 0 && prevFrame < files.length) {
                priorityQueue.push({
                    frame: prevFrame,
                    priority: 2,
                    url: files[prevFrame]
                });
            }
        }
        
        // 添加剩余帧（最低优先级）
        for (let i = 0; i < files.length; i++) {
            // 检查是否已添加到优先队列
            if (!priorityQueue.some(item => item.frame === i) && i !== currentFrame) {
                priorityQueue.push({
                    frame: i,
                    priority: 3,
                    url: files[i]
                });
            }
        }
        
        // 按优先级排序
        priorityQueue.sort((a, b) => a.priority - b.priority);
        
        // 将排序后的队列添加到加载队列
        this.preloadStatus.queue = priorityQueue;
        
        // 开始预加载过程
        this.processPreloadQueue(preloadIndicator);
    }

    async processPreloadQueue(indicator) {
        // 如果队列为空，完成预加载
        if (this.preloadStatus.queue.length === 0) {
            indicator.innerHTML = 'All frames preloaded';
            setTimeout(() => {
                indicator.style.opacity = '0';
                setTimeout(() => indicator.remove(), 500);
            }, 2000);
            return;
        }
        
        // 如果当前加载数量小于最大并发数，继续加载
        while (this.preloadStatus.currentLoading < this.preloadStatus.maxConcurrent && 
               this.preloadStatus.queue.length > 0) {
            
            const item = this.preloadStatus.queue.shift();
            this.preloadStatus.currentLoading++;
            
            // 更新加载进度
            const totalFrames = this.sequences[this.currentSequence].plyFiles.length;
            const loadedFrames = totalFrames - this.preloadStatus.queue.length - this.preloadStatus.currentLoading;
            const progress = Math.round((loadedFrames / totalFrames) * 100);
            indicator.innerHTML = `Preloading: ${progress}%`;
            
            // 检查是否已缓存
            if (this.preloadStatus.cache[item.url]) {
                this.preloadStatus.currentLoading--;
                this.processPreloadQueue(indicator);
                continue;
            }
            
            // 检查是否正在加载
            if (this.preloadStatus.loading[item.url]) {
                this.preloadStatus.currentLoading--;
                this.processPreloadQueue(indicator);
                continue;
            }
            
            // 标记为正在加载
            this.preloadStatus.loading[item.url] = true;
            
            // 加载PLY文件
            try {
                const loader = new THREE.PLYLoader();
                const geometry = await new Promise((resolve, reject) => {
                    loader.load(item.url, resolve, undefined, reject);
                });
                
                // 缓存几何体
                this.preloadStatus.cache[item.url] = geometry;
                
            } catch (error) {
                console.error(`Failed to preload frame ${item.frame}:`, error);
            }
            
            // 标记为加载完成
            delete this.preloadStatus.loading[item.url];
            this.preloadStatus.currentLoading--;
            
            // 继续处理队列
            this.processPreloadQueue(indicator);
        }
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

        // 获取当前序列和URL
        const url = this.sequences[this.currentSequence].plyFiles[frame];
        let geometry;
        
        try {
            // 检查是否已预加载
            if (this.preloadStatus && this.preloadStatus.cache[url]) {
                // 使用缓存的几何体
                geometry = this.preloadStatus.cache[url];
                // 移除加载指示器
                document.querySelector('.loading-indicator')?.remove();
            } else {
                // 未预加载，正常加载
                const loader = new THREE.PLYLoader();
                geometry = await new Promise((resolve, reject) => {
                    loader.load(url, resolve, undefined, reject);
                });
                
                // 缓存几何体以备将来使用
                if (this.preloadStatus) {
                    this.preloadStatus.cache[url] = geometry;
                }
                
                // 移除加载指示器
                document.querySelector('.loading-indicator')?.remove();
            }
            
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
                
                // 设置相机位置，使点云完全可见
                const maxDim = Math.max(
                    bbox.max.x - bbox.min.x,
                    bbox.max.y - bbox.min.y,
                    bbox.max.z - bbox.min.z
                );
                
                // 调整相机位置，使点云在视野中居中且大小合适
                this.camera.position.copy(center);
                this.camera.position.z += maxDim * 0.75;
                
                // 更新控制器
                this.controls.update();
                
                // 关闭初始加载标志
                this.isInitialLoad = false;
            }
            
            // 更新帧标签 - 只显示帧号
            document.getElementById('timeLabel').textContent = `${frame}`;
            
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

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    preloadThumbnails() {
        // 创建一个隐藏的容器来预加载视频
        const preloadContainer = document.createElement('div');
        preloadContainer.style.display = 'none';
        document.body.appendChild(preloadContainer);
        
        // 为每个序列创建预加载元素
        this.sequences.forEach(seq => {
            // 创建图像预加载
            if (seq.thumbnailPreview) {
                const img = new Image();
                img.src = seq.thumbnailPreview;
                preloadContainer.appendChild(img);
            }
            
            // 创建视频预加载
            const video = document.createElement('video');
            video.src = seq.thumbnail;
            video.muted = true;
            video.preload = 'auto';
            preloadContainer.appendChild(video);
            
            // 记录加载状态
            seq.loaded = false;
            video.addEventListener('canplaythrough', () => {
                seq.loaded = true;
            });
        });
    }

    // 添加缓存清理方法
    cleanupCache() {
        // 如果缓存大小超过限制
        const cacheKeys = Object.keys(this.preloadStatus.cache);
        if (cacheKeys.length > this.preloadStatus.maxCacheSize) {
            // 按最近使用时间排序（如果有记录）
            // 这里简化处理，直接删除最早的条目
            const keysToRemove = cacheKeys.slice(0, cacheKeys.length - this.preloadStatus.maxCacheSize);
            keysToRemove.forEach(key => {
                // 释放THREE.js几何体
                this.preloadStatus.cache[key].dispose();
                delete this.preloadStatus.cache[key];
            });
            
            // 强制垃圾回收（仅建议，不一定会立即执行）
            if (window.gc) window.gc();
        }
    }

    updateTimelineLoadingStatus() {
        // 获取当前序列的所有帧
        const files = this.sequences[this.currentSequence].plyFiles;
        const timeline = document.getElementById('timeline');
        
        // 移除现有的加载状态标记
        document.querySelectorAll('.timeline-loading-marker').forEach(el => el.remove());
        
        // 为每个帧创建加载状态标记
        for (let i = 0; i < files.length; i++) {
            const url = files[i];
            const marker = document.createElement('div');
            marker.className = 'timeline-loading-marker';
            
            // 设置标记位置
            const percent = (i / (files.length - 1)) * 100;
            marker.style.left = `${percent}%`;
            
            // 设置标记状态
            if (this.preloadStatus.cache[url]) {
                marker.classList.add('loaded');
            } else if (this.preloadStatus.loading[url]) {
                marker.classList.add('loading');
            }
            
            document.querySelector('.timeline-control').appendChild(marker);
        }
    }
}

// 初始化查看器
document.addEventListener('DOMContentLoaded', () => {
    const viewer = new PointCloudViewer();
    viewer.animate();
});