const API_CONFIG = {
    baseURL: 'http://127.0.0.1:5000',
    endpoints: {
        process: '/api/process',
        status: '/api/pipelines/status',
        reset: '/api/pipelines/reset',  // 添加reset端点
        start: '/api/pipelines/start',
        stop: '/api/pipelines/stop'
    }
};

const MODEL_CONFIG = {
    'wan_1.3B': {
        name: 'Wan2.1-Fun 1.3B',
        pipeline: 'wan_1.3B'
    },
    'wan_14B': {
        name: 'Wan2.1-Fun 14B', 
        pipeline: 'wan_14B'
    },
    'distilled_interactive_model': {
        name: '3-steps distilled model',
        pipeline: 'distilled_interactive_model'
    }
};