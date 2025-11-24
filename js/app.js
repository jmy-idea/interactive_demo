class VideoGenerator {
    constructor() {
        this.currentImage = null;
        this.currentKeys = [];
        this.currentModel = 'wan 1.3B';
        this.isProcessing = false; // 防止重复发送
        this.lastSendTime = 0; // 节流控制
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateKeyDisplay();
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

        // 键盘控制 - 实时发送
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // 按钮事件 - 移除发送按钮
        document.getElementById('clearButton').addEventListener('click', () => this.clearAll());
        document.getElementById('testButton').addEventListener('click', () => this.testConnection());
    }

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
            // 添加按键
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
            
            // 按键释放时也发送状态更新
            if (this.currentKeys.length === 0) {
                this.sendToServer();
            }
        }
    }

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

    async sendToServer() {
        // 检查是否有图片
        if (!this.currentImage) {
            this.setStatus('请先上传首帧图片');
            return;
        }

        // 节流控制：避免过于频繁的请求
        const now = Date.now();
        if (now - this.lastSendTime < 100) { // 100ms 节流
            return;
        }
        this.lastSendTime = now;

        // 防止重复请求
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;
        this.setStatus('发送控制指令...');

        try {
            const modelConfig = MODEL_CONFIG[this.currentModel];
            const pipelineId = modelConfig ? modelConfig.pipeline : 'wan_1.3b';
            
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
                throw new Error(`HTTP错误! 状态码: ${response.status}`);
            }

            const result = await response.json();
            this.handleServerResponse(result);
            
        } catch (error) {
            this.setStatus('发送失败：' + error.message);
            console.error('错误详情:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    handleServerResponse(result) {
        if (result.success) {
            this.setStatus(`控制指令已处理 - 模型: ${this.currentModel}`);
            
            // 更新结果文本
            document.getElementById('result').innerHTML = `
                <div class="result-success">
                    <strong>实时控制结果：</strong><br>
                    动作: ${result.keys_received?.join(', ') || '无'}<br>
                    模型: ${result.model_used || this.currentModel}<br>
                    状态: ${result.result || '处理完成'}<br>
                    时间: ${result.processed_at || '刚刚'}
                </div>
            `;

            // 显示视频或图片
            this.displayMedia(result);
        } else {
            this.setStatus('处理失败：' + (result.error || '未知错误'));
        }
    }

    displayMedia(result) {
        const videoPlayer = document.getElementById('videoPlayer');
        const currentFrame = document.getElementById('currentFrame');
        const videoPlaceholder = document.querySelector('.video-placeholder');

        if (result.video_data) {
            // 显示视频
            videoPlayer.src = result.video_data;
            videoPlayer.style.display = 'block';
            currentFrame.style.display = 'none';
            videoPlaceholder.style.display = 'none';
        } else if (result.current_frame) {
            // 显示当前帧
            currentFrame.src = `data:image/png;base64,${result.current_frame}`;
            currentFrame.style.display = 'block';
            videoPlayer.style.display = 'none';
            videoPlaceholder.style.display = 'none';
        }
    }

    async testConnection() {
        this.setStatus('测试服务器连接...');
        try {
            const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.status}`);
            
            if (!response.ok) {
                throw new Error(`HTTP错误! 状态码: ${response.status}`);
            }
    
            const result = await response.json();
            
            // 显示详细的pipeline状态
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
        
        document.getElementById('preview').src = '';
        document.getElementById('preview').style.display = 'none';
        document.querySelector('.upload-placeholder').style.display = 'block';
        
        document.getElementById('videoPlayer').style.display = 'none';
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
