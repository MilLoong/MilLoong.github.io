/**
 * 数据持久化存储模块
 * 用于保存用户行为数据、模型参数和应用配置
 */
const DataPersistence = {
  // 存储键名定义
  STORAGE_KEYS: {
    USER_HISTORY: 'food_selection_history',
    USER_PREFERENCES: 'food_recommendation_preferences',
    MODEL_CACHE: 'food_model_cache',
    SETTINGS: 'food_app_settings',
    FEEDBACK_DATA: 'food_feedback_data'
  },
  
  /**
   * 初始化存储
   */
  init() {
    if (!this.isStorageAvailable()) {
      console.warn('浏览器不支持本地存储，数据持久化功能将不可用');
      return false;
    }
    return true;
  },
  
  /**
   * 检查存储是否可用
   */
  isStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  },
  
  /**
   * 保存用户选择历史
   * @param {Object} selectionData 选择数据对象
   */
  saveSelectionHistory(selectionData) {
    if (!this.init()) return false;
    
    try {
      const history = this.getSelectionHistory() || [];
      
      // 添加选择时间戳
      const dataToSave = {
        ...selectionData,
        timestamp: selectionData.timestamp || new Date().toISOString()
      };
      
      history.push(dataToSave);
      
      // 限制历史记录数量，保留最近500条
      const MAX_HISTORY = 500;
      if (history.length > MAX_HISTORY) {
        history.splice(0, history.length - MAX_HISTORY);
      }
      
      localStorage.setItem(this.STORAGE_KEYS.USER_HISTORY, JSON.stringify(history));
      return true;
    } catch (error) {
      console.error('保存选择历史失败:', error);
      return false;
    }
  },
  
  /**
   * 获取用户选择历史
   */
  getSelectionHistory() {
    if (!this.init()) return null;
    
    try {
      const historyData = localStorage.getItem(this.STORAGE_KEYS.USER_HISTORY);
      return historyData ? JSON.parse(historyData) : [];
    } catch (error) {
      console.error('读取选择历史失败:', error);
      return [];
    }
  },
  
  /**
   * 保存用户偏好设置
   * @param {Object} preferences 用户偏好对象
   */
  savePreferences(preferences) {
    if (!this.init()) return false;
    
    try {
      const preferencesWithTimestamp = {
        ...preferences,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferencesWithTimestamp));
      return true;
    } catch (error) {
      console.error('保存偏好设置失败:', error);
      return false;
    }
  },
  
  /**
   * 获取用户偏好设置
   */
  getPreferences() {
    if (!this.init()) return null;
    
    try {
      const prefsData = localStorage.getItem(this.STORAGE_KEYS.USER_PREFERENCES);
      return prefsData ? JSON.parse(prefsData) : null;
    } catch (error) {
      console.error('读取偏好设置失败:', error);
      return null;
    }
  },
  
  /**
   * 缓存模型数据
   * @param {Object} modelData 模型数据对象
   * @param {String} modelVersion 模型版本号
   */
  cacheModel(modelData, modelVersion = '1.0') {
    if (!this.init()) return false;
    
    try {
      const cacheData = {
        model: modelData,
        version: modelVersion,
        cachedAt: new Date().toISOString(),
        hash: this.generateDataHash(JSON.stringify(modelData))
      };
      
      localStorage.setItem(this.STORAGE_KEYS.MODEL_CACHE, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      console.error('缓存模型数据失败:', error);
      return false;
    }
  },
  
  /**
   * 获取缓存的模型数据
   */
  getCachedModel() {
    if (!this.init()) return null;
    
    try {
      const cacheData = localStorage.getItem(this.STORAGE_KEYS.MODEL_CACHE);
      if (!cacheData) return null;
      
      const cached = JSON.parse(cacheData);
      
      // 检查缓存是否过期（7天）
      const cacheTime = new Date(cached.cachedAt);
      const now = new Date();
      const daysDiff = (now - cacheTime) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 7) {
        console.log('模型缓存已过期');
        this.clearModelCache();
        return null;
      }
      
      return cached;
    } catch (error) {
      console.error('读取模型缓存失败:', error);
      return null;
    }
  },
  
  /**
   * 清除模型缓存
   */
  clearModelCache() {
    if (!this.init()) return;
    localStorage.removeItem(this.STORAGE_KEYS.MODEL_CACHE);
  },
  
  /**
   * 保存应用设置
   * @param {Object} settings 设置对象
   */
  saveSettings(settings) {
    if (!this.init()) return false;
    
    try {
      localStorage.setItem(this.STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('保存设置失败:', error);
      return false;
    }
  },
  
  /**
   * 获取应用设置
   */
  getSettings() {
    if (!this.init()) return null;
    
    try {
      const settingsData = localStorage.getItem(this.STORAGE_KEYS.SETTINGS);
      return settingsData ? JSON.parse(settingsData) : null;
    } catch (error) {
      console.error('读取设置失败:', error);
      return null;
    }
  },
  
  /**
   * 保存用户反馈数据
   * @param {Object} feedback 反馈数据对象
   */
  saveFeedback(feedback) {
    if (!this.init()) return false;
    
    try {
      const feedbackList = this.getFeedbackData() || [];
      
      const feedbackToSave = {
        ...feedback,
        id: this.generateId(),
        timestamp: new Date().toISOString()
      };
      
      feedbackList.push(feedbackToSave);
      
      // 限制反馈数据数量，保留最近200条
      const MAX_FEEDBACK = 200;
      if (feedbackList.length > MAX_FEEDBACK) {
        feedbackList.splice(0, feedbackList.length - MAX_FEEDBACK);
      }
      
      localStorage.setItem(this.STORAGE_KEYS.FEEDBACK_DATA, JSON.stringify(feedbackList));
      return true;
    } catch (error) {
      console.error('保存反馈数据失败:', error);
      return false;
    }
  },
  
  /**
   * 获取反馈数据
   */
  getFeedbackData() {
    if (!this.init()) return null;
    
    try {
      const feedbackData = localStorage.getItem(this.STORAGE_KEYS.FEEDBACK_DATA);
      return feedbackData ? JSON.parse(feedbackData) : [];
    } catch (error) {
      console.error('读取反馈数据失败:', error);
      return [];
    }
  },
  
  /**
   * 导出所有数据
   */
  exportAllData() {
    if (!this.init()) return null;
    
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        history: this.getSelectionHistory(),
        preferences: this.getPreferences(),
        settings: this.getSettings(),
        feedback: this.getFeedbackData()
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('导出数据失败:', error);
      return null;
    }
  },
  
  /**
   * 导入数据
   * @param {String} jsonData JSON格式的数据字符串
   */
  importData(jsonData) {
    if (!this.init()) return false;
    
    try {
      const data = JSON.parse(jsonData);
      
      // 导入各类型数据
      if (data.history) {
        localStorage.setItem(this.STORAGE_KEYS.USER_HISTORY, JSON.stringify(data.history));
      }
      if (data.preferences) {
        localStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(data.preferences));
      }
      if (data.settings) {
        localStorage.setItem(this.STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
      }
      if (data.feedback) {
        localStorage.setItem(this.STORAGE_KEYS.FEEDBACK_DATA, JSON.stringify(data.feedback));
      }
      
      return true;
    } catch (error) {
      console.error('导入数据失败:', error);
      return false;
    }
  },
  
  /**
   * 清空所有数据
   */
  clearAllData() {
    if (!this.init()) return false;
    
    try {
      Object.values(this.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('清空数据失败:', error);
      return false;
    }
  },
  
  /**
   * 生成唯一ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },
  
  /**
   * 生成数据哈希值
   */
  generateDataHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  },
  
  /**
   * 获取存储使用情况统计
   */
  getStorageStats() {
    if (!this.init()) return null;
    
    try {
      const stats = {};
      let totalSize = 0;
      
      Object.entries(this.STORAGE_KEYS).forEach(([name, key]) => {
        const data = localStorage.getItem(key) || '';
        const size = new Blob([data]).size;
        stats[name] = { size, sizeKB: (size / 1024).toFixed(2) };
        totalSize += size;
      });
      
      stats.total = { size: totalSize, sizeKB: (totalSize / 1024).toFixed(2) };
      
      return stats;
    } catch (error) {
      console.error('获取存储统计失败:', error);
      return null;
    }
  }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataPersistence;
} else {
  window.DataPersistence = DataPersistence;
}
