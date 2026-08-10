/**
 * Model Loader for Food Recommendation System
 * This module handles loading and parsing the Python-trained model data
 * for use in the JavaScript frontend.
 */

// 存储加载的模型数据
let currentModel = null;
let modelLoadTime = null;

// 存储键名常量
const MODEL_STORAGE_KEY = 'food_recommendation_model';
const MODEL_TIMESTAMP_KEY = 'food_model_timestamp';
const MODEL_VERSION_KEY = 'food_model_version';

// 默认模型参数
const DEFAULT_MODEL = {
    base_scores: {},
    time_preferences: {},
    tag_preferences: {},
    season_preferences: {},
    category_preferences: {},
    features: {
        tags: [],
        categories: [],
        times: [],
        seasons: []
    },
    metadata: {
        version: '1.0',
        conversion_time: new Date().toISOString()
    }
};

/**
 * 加载模型数据
 * @param {string} modelUrl - 模型JSON文件的URL
 * @param {boolean} forceRefresh - 是否强制刷新缓存
 * @returns {Promise<Object>} - 模型数据
 */
async function loadModel(modelUrl = '/static/data/js_model_data.json', forceRefresh = false) {
    try {
        // 首先检查是否有缓存的模型数据
        if (!forceRefresh) {
            const cachedModel = loadModelFromStorage();
            if (cachedModel) {
                console.log('Using cached model data');
                currentModel = cachedModel;
                return cachedModel;
            }
        }

        // 从服务器加载模型数据
        console.log(`Loading model data from: ${modelUrl}`);
        const response = await fetch(modelUrl);
        
        if (!response.ok) {
            throw new Error(`Failed to load model: ${response.status} ${response.statusText}`);
        }
        
        const modelData = await response.json();
        
        // 验证模型数据格式
        const validatedModel = validateModelData(modelData);
        
        // 缓存模型数据
        saveModelToStorage(validatedModel);
        
        // 更新当前模型
        currentModel = validatedModel;
        modelLoadTime = new Date();
        
        console.log('Model loaded successfully');
        console.log(`Model version: ${validatedModel.metadata.version}`);
        console.log(`Model trained on: ${validatedModel.metadata.conversion_time}`);
        
        return validatedModel;
    } catch (error) {
        console.error('Error loading model:', error);
        
        // 如果加载失败，使用默认模型
        currentModel = DEFAULT_MODEL;
        return DEFAULT_MODEL;
    }
}

/**
 * 验证模型数据格式
 * @param {Object} modelData - 原始模型数据
 * @returns {Object} - 验证后的模型数据
 */
function validateModelData(modelData) {
    // 创建验证后的模型对象，合并默认值
    const validatedModel = {
        ...DEFAULT_MODEL,
        ...modelData
    };
    
    // 确保必要的结构存在
    if (!validatedModel.base_scores || typeof validatedModel.base_scores !== 'object') {
        validatedModel.base_scores = {};
    }
    
    if (!validatedModel.metadata) {
        validatedModel.metadata = DEFAULT_MODEL.metadata;
    }
    
    if (!validatedModel.features) {
        validatedModel.features = DEFAULT_MODEL.features;
    }
    
    return validatedModel;
}

/**
 * 从localStorage加载模型数据
 * @returns {Object|null} - 模型数据或null
 */
function loadModelFromStorage() {
    try {
        const modelDataStr = localStorage.getItem(MODEL_STORAGE_KEY);
        const timestampStr = localStorage.getItem(MODEL_TIMESTAMP_KEY);
        
        if (!modelDataStr || !timestampStr) {
            return null;
        }
        
        const modelData = JSON.parse(modelDataStr);
        const timestamp = new Date(timestampStr);
        
        // 检查模型是否过期（24小时）
        const now = new Date();
        const hoursDiff = (now - timestamp) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
            console.log('Cached model is outdated, will reload');
            return null;
        }
        
        return modelData;
    } catch (error) {
        console.error('Error loading model from storage:', error);
        return null;
    }
}

/**
 * 保存模型数据到localStorage
 * @param {Object} modelData - 要保存的模型数据
 */
function saveModelToStorage(modelData) {
    try {
        localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(modelData));
        localStorage.setItem(MODEL_TIMESTAMP_KEY, new Date().toISOString());
        
        if (modelData.metadata && modelData.metadata.version) {
            localStorage.setItem(MODEL_VERSION_KEY, modelData.metadata.version);
        }
    } catch (error) {
        console.error('Error saving model to storage:', error);
        // 存储空间可能已满，尝试清理
        try {
            localStorage.removeItem(MODEL_STORAGE_KEY);
            localStorage.removeItem(MODEL_TIMESTAMP_KEY);
        } catch (e) {
            console.error('Failed to clean storage:', e);
        }
    }
}

/**
 * 获取当前加载的模型
 * @returns {Object} - 当前模型数据
 */
function getCurrentModel() {
    return currentModel || DEFAULT_MODEL;
}

/**
 * 检查模型是否已加载
 * @returns {boolean} - 是否已加载模型
 */
function isModelLoaded() {
    return currentModel !== null;
}

/**
 * 获取模型的推荐分数
 * @param {string} foodId - 食物ID
 * @param {Object} context - 上下文信息
 * @returns {number} - 推荐分数(0-1)
 */
function getRecommendationScore(foodId, context = {}) {
    if (!currentModel) {
        return 0.5; // 默认中等分数
    }
    
    let score = 0.5; // 基础默认分数
    
    // 1. 获取基础推荐分数
    if (currentModel.base_scores && currentModel.base_scores[foodId] !== undefined) {
        score = currentModel.base_scores[foodId];
    }
    
    // 2. 应用上下文调整
    if (context) {
        // 时间偏好调整
        if (context.time && currentModel.time_preferences && currentModel.time_preferences[context.time]) {
            const timeFactor = currentModel.time_preferences[context.time];
            // 使用加权平均，时间偏好占30%权重
            score = score * 0.7 + timeFactor * 0.3;
        }
        
        // 季节偏好调整
        if (context.season && currentModel.season_preferences && currentModel.season_preferences[context.season]) {
            const seasonFactor = currentModel.season_preferences[context.season];
            score = score * 0.8 + seasonFactor * 0.2;
        }
    }
    
    // 确保分数在0-1范围内
    return Math.max(0, Math.min(1, score));
}

/**
 * 批量获取多个食物的推荐分数
 * @param {Array<string>} foodIds - 食物ID数组
 * @param {Object} context - 上下文信息
 * @returns {Object} - 食物ID到分数的映射
 */
function getBatchRecommendationScores(foodIds, context = {}) {
    const scores = {};
    
    if (!Array.isArray(foodIds)) {
        console.error('foodIds must be an array');
        return scores;
    }
    
    foodIds.forEach(foodId => {
        scores[foodId] = getRecommendationScore(foodId, context);
    });
    
    return scores;
}

/**
 * 获取用户对特定特征的偏好
 * @param {string} featureType - 特征类型(tags/categories/times/seasons)
 * @param {string} featureValue - 特征值
 * @returns {number} - 偏好分数(0-1)
 */
function getFeaturePreference(featureType, featureValue) {
    if (!currentModel) {
        return 0.5;
    }
    
    const preferenceMap = {
        'tags': currentModel.tag_preferences,
        'categories': currentModel.category_preferences,
        'times': currentModel.time_preferences,
        'seasons': currentModel.season_preferences
    };
    
    const preferences = preferenceMap[featureType];
    
    if (preferences && preferences[featureValue] !== undefined) {
        return preferences[featureValue];
    }
    
    return 0.5; // 默认中性偏好
}

/**
 * 刷新模型数据
 * @param {string} modelUrl - 模型URL
 * @returns {Promise<Object>} - 新的模型数据
 */
async function refreshModel(modelUrl = '/static/data/js_model_data.json') {
    return loadModel(modelUrl, true);
}

/**
 * 清理缓存的模型数据
 */
function clearModelCache() {
    try {
        localStorage.removeItem(MODEL_STORAGE_KEY);
        localStorage.removeItem(MODEL_TIMESTAMP_KEY);
        localStorage.removeItem(MODEL_VERSION_KEY);
        currentModel = null;
        modelLoadTime = null;
        console.log('Model cache cleared');
    } catch (error) {
        console.error('Error clearing model cache:', error);
    }
}

/**
 * 获取模型统计信息
 * @returns {Object} - 模型统计信息
 */
function getModelStats() {
    if (!currentModel) {
        return {
            status: 'not_loaded',
            model_age: null,
            version: null,
            data_points: 0
        };
    }
    
    // 计算模型年龄
    let modelAge = null;
    if (modelLoadTime) {
        const ageMs = new Date() - modelLoadTime;
        modelAge = {
            milliseconds: ageMs,
            seconds: Math.floor(ageMs / 1000),
            minutes: Math.floor(ageMs / (1000 * 60)),
            hours: Math.floor(ageMs / (1000 * 60 * 60))
        };
    }
    
    // 计算数据点数量
    const dataPoints = Object.keys(currentModel.base_scores || {}).length;
    
    return {
        status: 'loaded',
        model_age: modelAge,
        version: currentModel.metadata?.version || 'unknown',
        conversion_time: currentModel.metadata?.conversion_time || null,
        data_points: dataPoints,
        has_preferences: {
            time: Object.keys(currentModel.time_preferences || {}).length > 0,
            tag: Object.keys(currentModel.tag_preferences || {}).length > 0,
            season: Object.keys(currentModel.season_preferences || {}).length > 0,
            category: Object.keys(currentModel.category_preferences || {}).length > 0
        }
    };
}

/**
 * 导出模型加载器的公共API
 */
const ModelLoader = {
    loadModel,
    getCurrentModel,
    isModelLoaded,
    getRecommendationScore,
    getBatchRecommendationScores,
    getFeaturePreference,
    refreshModel,
    clearModelCache,
    getModelStats,
    DEFAULT_MODEL
};

// 如果在浏览器环境中，将ModelLoader挂载到window对象
if (typeof window !== 'undefined') {
    window.ModelLoader = ModelLoader;
}

// 导出模块
if (typeof module !== 'undefined') {
    module.exports = ModelLoader;
}
