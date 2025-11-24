// API配置
const API_CONFIG = {
    baseURL: 'http://127.0.0.1:5000',
    endpoints: {
        process: '/api/process',
        status: '/api/pipelines/status'
    }
};

const MODEL_CONFIG = {
    'wan_1.3b': {
        name: 'Wan2.1-Fun 1.3B模型',
        pipeline: 'wan_1.3b',
        description: '轻量级模型，快速推理'
    },
    'wan_14b': {
        name: 'Wan2.1-Fun 14B模型', 
        pipeline: 'wan_14b',
        description: '高质量模型，效果更好'
    },
    'custom_model': {
        name: '3步蒸馏模型',
        pipeline: 'distilled_interactive_model',
        description: '使用自定义pipeline'
    }
};
