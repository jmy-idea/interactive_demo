class VideoGenerator {
    constructor() {
        this.currentImage = null;
        this.currentKeys = [];
        this.currentModel = '1.3B';
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
            this.toggleCustomModelInput();
            console.log(`切换到模型: ${this.currentModel}`);
        });

        // 图片上传
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

        // 按钮事件
        document.getElementById('sendButton').addEventListener('click', () => this.sendToServer());
        document.getElementById('clearButton').addEventListener('click', () => this.clearAll());
        document.getElementById('testButton').addEventListener('click', () => this.testConnection());
    }

    toggleCustomModelInput() {
        const customInput = document.getElementById('customModel');
        customInput.style.display = this.currentModel === 'custom' ? 'block' : 'none';
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
            
            this.setStatus('图片上传成功！现在可以按WASD键测试');
        };
        reader.readAsDataURL(file);
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        if (['w', 'a', 's', 'd'].includes(key) && !this.currentKeys.includes(key)) {
            this.currentKeys.push(key);
            this.updateKeyDisplay();
            this.updateKeyVisual();
            // 自动发送到服务器
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
        if (!this.currentImage) {
            this.setStatus('请先上传图片');
            return;
        }

        this.setStatus('发送数据到服务器...');
        
        try {
            const modelPath = this.currentModel === 'custom' 
                ? document.getElementById('customModel').value 
                : MODEL_CONFIG[this.currentModel].path;

            const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.process}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: this.currentImage,
                    keys: this.currentKeys,
                    model: modelPath  // 发送模型信息给后端
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
        }
    }

    handleServerResponse(result) {
        if (result.success) {
            this.setStatus('处理完成！');
            
            // 更新结果文本
            document.getElementById('result').innerHTML = `
                <div class="result-success">
                    <strong>生成结果：</strong><br>
                    情感: ${result.result}<br>
                    图片尺寸: ${result.image_size}<br>
                    按键: ${result.keys_received?.join(', ') || '无'}<br>
                    处理时间: ${result.processed_at}
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
            const result = await response.json();
            this.setStatus(`连接成功: 模型状态 - ${result.model_ready ? '就绪' : '未就绪'}`);
        } catch (error) {
            this.setStatus('连接失败：' + error.message);
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
        this.setStatus('已清空');
    }

    setStatus(message) {
        document.getElementById('status').textContent = message;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new VideoGenerator();
});