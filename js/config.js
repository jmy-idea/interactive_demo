// API配置
const API_CONFIG = {
    baseURL: 'http://127.0.0.1:5000',
    endpoints: {
        process: '/api/process',
        status: '/api/status'
    }
};

// 模型配置
const MODEL_CONFIG = {
    '1.3B': {
        name: 'Wan2.1-Fun 1.3B模型',
        path: '/root/wzy/model/Wan2.1-Fun-V1.1-1.3B-Control-Camera',
        description: '轻量级模型，快速推理'
    },
    '14B': {
        name: 'Wan2.1-Fun 14B模型', 
        path: '/root/wzy/model/Wan2.1-Fun-V1.1-14B-Control-Camera',
        description: '高质量模型，效果更好'
    },
    'custom': {
        name: '自定义模型',
        path: '',
        description: '使用自定义模型路径'
    }
};