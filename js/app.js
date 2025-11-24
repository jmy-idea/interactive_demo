class VideoGenerator {
    constructor() {
        this.currentImage = null;
        this.currentKeys = [];
        this.currentModel = 'wan_1.3B';
        this.isProcessing = false;
        this.lastSendTime = 0;
        this.videoQueue = []; // 视频队列
        this.isPlaying = false; // 当前是否在播放
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateKeyDisplay();
        this.setupVideoPlayer();
    }

    setupVideoPlayer() {
        const videoPlayer = document.getElementById('videoPlayer');
        
        // 视频结束事件 - 播放下一个视频
        videoPlayer.addEventListener('ended', () => {
            console.log('当前视频播放结束');
            this.playNextVideo();
        });
        
        // 视频错误处理
        videoPlayer.addEventListener('error', (e) => {
            console.error('视频播放错误:', e);
            this.playNextVideo();
        });
    }

    bindEvents() {
        // 模型选择
        document.getElementById('modelSelect').addEventListener('change', (e) => {
            this.currentModel = e.target.value;
            this.setStatus(`已切换到: ${this.currentModel}`);
        });

        // 图片上传 (保持不变)
        const uploadArea = document.getElementById('uploadArea');
        const imageInput = document.getElementById('imageInput');
        
        uploadArea.addEventListener('click', () => imageInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#667eea';
            uploadArea.style.background = '#edf2f7';
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '#cbd5e0';
            uploadArea.style.background = '#f7fafc';
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files[0]) this.handleImageUpload(files[0]);
        });

        imageInput.addEventListener('change', (e) => {
            if (e.target.files[0]) this.handleImageUpload(e.target.files[0]);
        });

        // 键盘控制
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // 按钮事件 - 添加reset按钮
        document.getElementById('clearButton').addEventListener('click', () => this.clearAll());
        document.getElementById('resetButton').addEventListener('click', () => this.resetPipeline());
        document.getElementById('testButton').addEventListener('click', () => this.testConnection());
    }

    // 添加resetPipeline方法
    async resetPipeline() {
        if (!this.currentModel) {
            this.setStatus('请先选择模型');
            return;
        }

        this.setStatus('正在重置pipeline...');
        
        try {
            // 获取对应的pipeline ID
            const modelConfig = MODEL_CONFIG[this.currentModel];
            const pipelineId = modelConfig ? modelConfig.pipeline : this.currentModel;

            console.log('发送reset信号到后端:', { model: pipelineId });

            const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.reset}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: pipelineId
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP错误! 状态码: ${response.status}, 详情: ${errorText}`);
            }

            const result = await response.json();
            console.log('Reset响应:', result);
            
            if (result.success) {
                this.setStatus(`✅ ${result.message || 'Pipeline重置成功'}`);
                // 清空当前状态
                this.currentKeys = [];
                this.updateKeyDisplay();
                this.updateKeyVisual();
            } else {
                this.setStatus(`❌ 重置失败: ${result.error || '未知错误'}`);
            }
            
        } catch (error) {
            console.error('Reset错误:', error);
            this.setStatus('重置失败：' + error.message);
        }
    }

    // 其他方法保持不变...
    handleImageUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentImage = e.target.result;
            const preview = document.getElementById('preview');
            const placeholder = document.querySelector('.upload-placeholder');
            
            preview.src = this.currentImage;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
            
            this.setStatus('首帧图片已上传！现在可以使用 WASD 键实时控制');
        };
        reader.readAsDataURL(file);
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        if (['w', 'a', 's', 'd'].includes(key) && !this.currentKeys.includes(key)) {
            this.currentKeys.push(key);
            this.updateKeyDisplay();
            this.updateKeyVisual();
            
            // 立即发送到服务器（带节流）
            this.sendToServer();
        }
    }

    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        const index = this.currentKeys.indexOf(key);
        if (index > -1) {
            this.currentKeys.splice(index, 1);
            this.updateKeyDisplay();
            this.updateKeyVisual();
            
            if (this.currentKeys.length === 0) {
                this.sendToServer();
            }
        }
    }

    async sendToServer() {
        if (!this.currentImage) {
            this.setStatus('请先上传首帧图片');
            return;
        }

        // 节流控制
        const now = Date.now();
        if (now - this.lastSendTime < 100) {
            return;
        }
        this.lastSendTime = now;

        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;
        this.setStatus('发送控制指令...');

        try {
            const modelConfig = MODEL_CONFIG[this.currentModel];
            const pipelineId = modelConfig ? modelConfig.pipeline : this.currentModel;

            console.log('发送数据到后端:', {
                model: pipelineId,
                keys: this.currentKeys,
                imageLength: this.currentImage.length
            });

            const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.process}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: this.currentImage,
                    keys: this.currentKeys,
                    model: pipelineId
                })
            });

            if (!response.ok) {
                let errorText;
                try {
                    errorText = await response.text();
                    const errorData = JSON.parse(errorText);
                    throw new Error(`HTTP错误! 状态码: ${response.status}, 详情: ${errorData.error || errorText}`);
                } catch (e) {
                    throw new Error(`HTTP错误! 状态码: ${response.status}, 响应: ${errorText || '无详细信息'}`);
                }
            }

            const result = await response.json();
            console.log('成功响应:', result);
            this.handleServerResponse(result);
            
        } catch (error) {
            console.error('完整错误信息:', error);
            this.setStatus('发送失败：' + error.message);
        } finally {
            this.isProcessing = false;
        }
    }

    // 其他方法保持不变...
    updateKeyDisplay() {
        document.getElementById('currentKeys').textContent = 
            `当前按键：${this.currentKeys.join(', ') || '无'}`;
    }

    updateKeyVisual() {
        ['w', 'a', 's', 'd'].forEach(key => {
            const element = document.getElementById(`key${key.toUpperCase()}`);
            if (this.currentKeys.includes(key)) {
                element.classList.add('key-active');
            } else {
                element.classList.remove('key-active');
            }
        });
    }

    handleServerResponse(result) {
        if (result.success) {
            this.setStatus(`控制指令已处理 - 模型: ${this.currentModel}`);
            
            // 更新结果显示
            document.getElementById('result').innerHTML = `
                <div class="result-success">
                    <strong>实时控制结果：</strong><br>
                    动作: ${result.keys_received?.join(', ') || '无'}<br>
                    模型: ${result.model_used || this.currentModel}<br>
                    状态: ${result.result || '处理完成'}<br>
                    时间: ${new Date(result.processed_at * 1000).toLocaleTimeString() || '刚刚'}
                    ${result.video_data ? '<br>🎥 视频数据已接收' : ''}
                </div>
            `;

            // 处理媒体数据
            this.processMediaResponse(result);
            
        } else {
            this.setStatus('处理失败：' + (result.error || '未知错误'));
        }
    }

    processMediaResponse(result) {
        const videoPlayer = document.getElementById('videoPlayer');
        const currentFrame = document.getElementById('currentFrame');
        const videoPlaceholder = document.querySelector('.video-placeholder');

        console.log('处理媒体数据:', {
            hasVideoData: !!result.video_data,
            hasCurrentFrame: !!result.current_frame
        });

        // 优先处理视频数据
        if (result.video_data) {
            console.log('🎥 收到视频数据，添加到播放队列');
            
            // 添加到视频队列
            this.videoQueue.push(result.video_data);
            
            // 隐藏图片和占位符
            currentFrame.style.display = 'none';
            videoPlaceholder.style.display = 'none';
            videoPlayer.style.display = 'block';
            
            // 如果没有正在播放，立即开始播放
            if (!this.isPlaying && this.videoQueue.length === 1) {
                this.playNextVideo();
            }
            
        } else if (result.current_frame) {
            // 如果没有视频数据，显示当前帧
            console.log('🖼️ 显示当前帧');
            this.showCurrentFrame(result.current_frame);
        } else {
            // 没有媒体数据
            console.log('没有可显示的媒体数据');
            videoPlayer.style.display = 'none';
            currentFrame.style.display = 'none';
            videoPlaceholder.style.display = 'block';
        }
        
        // 更新当前图像状态为最后一帧（用于下一次推理）
        if (result.current_frame) {
            this.currentImage = result.current_frame;
            console.log('✅ 更新当前图像状态为最后一帧');
        }
    }

    playNextVideo() {
        if (this.videoQueue.length === 0) {
            console.log('视频队列为空，停止播放');
            this.isPlaying = false;
            return;
        }

        const nextVideoSrc = this.videoQueue.shift(); // 取出队列中的第一个视频
        const videoPlayer = document.getElementById('videoPlayer');
        
        console.log('开始播放下一个视频，队列剩余:', this.videoQueue.length);
        
        this.isPlaying = true;
        
        // 设置视频源
        videoPlayer.src = nextVideoSrc;
        
        // 自动播放
        videoPlayer.play().then(() => {
            console.log('✅ 视频自动播放成功');
        }).catch(error => {
            console.warn('❌ 自动播放被阻止:', error);
            // 如果自动播放被阻止，显示播放按钮让用户手动点击
            videoPlayer.controls = true;
            this.isPlaying = false;
        });
    }

    showCurrentFrame(frameData) {
        const videoPlayer = document.getElementById('videoPlayer');
        const currentFrame = document.getElementById('currentFrame');
        const videoPlaceholder = document.querySelector('.video-placeholder');
        
        // 清空视频队列（如果有的话）
        this.videoQueue = [];
        this.isPlaying = false;
        videoPlayer.style.display = 'none';
        
        let imageSrc = frameData;
        
        // 处理base64数据格式
        if (typeof imageSrc === 'string') {
            if (imageSrc.startsWith('data:image/')) {
                // 已经是data URL，直接使用
                console.log('使用完整的data URL');
            } else if (imageSrc.startsWith('/9j/') || imageSrc.startsWith('iVBOR')) {
                // 是纯base64数据，需要添加前缀
                console.log('检测到纯base64数据，添加前缀');
                imageSrc = `data:image/png;base64,${imageSrc}`;
            } else {
                // 其他情况，尝试作为base64处理
                console.log('作为base64数据处理');
                imageSrc = `data:image/png;base64,${imageSrc}`;
            }
        }
        
        currentFrame.onload = () => {
            console.log('✅ 图片加载成功');
            currentFrame.style.display = 'block';
            videoPlaceholder.style.display = 'none';
        };
        
        currentFrame.onerror = () => {
            console.error('❌ 图片加载失败');
            // 尝试不同的格式
            const alternativeSrc = imageSrc.replace('image/png', 'image/jpeg');
            console.log('尝试JPEG格式');
            currentFrame.src = alternativeSrc;
        };
        
        currentFrame.src = imageSrc;
    }

    async testConnection() {
        this.setStatus('测试服务器连接...');
        try {
            const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.status}`);
            
            if (!response.ok) {
                throw new Error(`HTTP错误! 状态码: ${response.status}`);
            }
    
            const result = await response.json();
            
            let statusMessage = '连接成功！服务器状态：\n';
            for (const [pipelineId, pipelineStatus] of Object.entries(result)) {
                statusMessage += `${pipelineId}: ${pipelineStatus.status}\n`;
            }
            
            this.setStatus(statusMessage);
            
        } catch (error) {
            this.setStatus('连接失败：' + error.message);
            console.error('连接测试错误:', error);
        }
    }

    clearAll() {
        this.currentImage = null;
        this.currentKeys = [];
        this.videoQueue = []; // 清空视频队列
        this.isPlaying = false; // 重置播放状态
        
        const videoPlayer = document.getElementById('videoPlayer');
        videoPlayer.src = ''; // 清空视频源
        videoPlayer.style.display = 'none';
        
        document.getElementById('preview').src = '';
        document.getElementById('preview').style.display = 'none';
        document.querySelector('.upload-placeholder').style.display = 'block';
        
        document.getElementById('currentFrame').style.display = 'none';
        document.querySelector('.video-placeholder').style.display = 'block';
        
        document.getElementById('result').innerHTML = `
            <div class="result-placeholder">
                <span class="result-icon">⏳</span>
                <p>等待生成视频...</p>
            </div>
        `;
        
        this.updateKeyDisplay();
        this.updateKeyVisual();
        this.setStatus('已清空图片 - 请上传新的首帧图片');
    }

    setStatus(message) {
        document.getElementById('status').textContent = message;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new VideoGenerator();
});