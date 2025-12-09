// whattoeat.js - 吃什么页面交互逻辑

// 引入模型加载器
const modelLoader = window.modelLoader || {};

// 食物数据，将从模型加载器获取
let foods = [];
let modelParams = {};
let currentContext = { season: getCurrentSeason(), context: getCurrentContext() };

// 获取当前季节
function getCurrentSeason() {
  const month = new Date().getMonth() + 1; // JavaScript月份从0开始
  if (month >= 3 && month <= 5) return '春季';
  if (month >= 6 && month <= 8) return '夏季';
  if (month >= 9 && month <= 11) return '秋季';
  return '冬季';
}

// 获取当前场景
function getCurrentContext() {
  const hour = new Date().getHours();
  // 只保留午餐(11:00-14:00)和晚餐(17:00-19:00)
  if (hour >= 11 && hour < 14) return 'lunch';
  if (hour >= 17 && hour < 19) return 'dinner';
  return 'general';
}

// 计算食物的加权分数（基于模型参数）
function calculateFoodScore(food) {
  let score = modelParams.base_scores?.[food.id] || 0.5; // 默认基础分数
  
  // 应用标签权重
  if (food.tags && modelParams.tag_weights) {
    food.tags.forEach(tag => {
      score += (modelParams.tag_weights[tag] || 0) * 0.1;
    });
  }
  
  // 应用分类权重
  if (food.category && modelParams.category_weights) {
    score += (modelParams.category_weights[food.category] || 0) * 0.2;
  }
  
  // 应用季节权重
  if (food.seasons && food.seasons.includes(currentContext.season) && modelParams.season_weights) {
    score += (modelParams.season_weights[currentContext.season] || 0) * 0.2;
  }
  
  // 应用场景权重
  if (food.contexts && food.contexts.includes(currentContext.context) && modelParams.context_weights) {
    score += (modelParams.context_weights[currentContext.context] || 0) * 0.2;
  }
  
  return score;
}

// 当前排序方式
let currentSort = { field: 'name', order: 'asc' };

// 排序食物列表
function sortFoods(foodsArray, sortField, sortOrder) {
  return [...foodsArray].sort((a, b) => {
    let aValue, bValue;
    
    // 根据排序字段获取值
    if (sortField === 'name') {
      aValue = a[sortField].toLowerCase();
      bValue = b[sortField].toLowerCase();
    } else if (sortField === 'category') {
      aValue = a[sortField] || '';
      bValue = b[sortField] || '';
    } else {
      // 基于分数排序
      aValue = calculateFoodScore(a);
      bValue = calculateFoodScore(b);
    }
    
    // 排序逻辑
    if (sortOrder === 'asc') {
      if (aValue < bValue) return -1;
      if (aValue > bValue) return 1;
      return 0;
    } else {
      if (aValue > bValue) return -1;
      if (aValue < bValue) return 1;
      return 0;
    }
  });
}

// 渲染食物列表
function renderFoodList(sortField = currentSort.field, sortOrder = currentSort.order) {
  const foodGrid = document.querySelector('.food-grid');
  const sortControls = document.querySelector('.sort-controls');
  const emptyState = document.getElementById('emptyState');
  const foodList = document.getElementById('foodList');
  if (!foodGrid) return;
  
  // 更新当前排序状态
  currentSort = { field: sortField, order: sortOrder };
  
  // 根据食物数量控制元素显示状态
  if (foods.length === 0) {
    // 有食物时隐藏emptyState，显示foodList
    if (emptyState) emptyState.style.display = 'block';
    if (foodList) foodList.style.display = 'none';
    
    foodGrid.innerHTML = `
      <div class="no-foods-message">
        <h3>还没有加载任何食物数据</h3>
        <p>正在从服务器加载食物数据，请稍候...</p>
      </div>
    `;
    return;
  } else {
    // 有食物时显示foodList，隐藏emptyState
    if (emptyState) emptyState.style.display = 'none';
    if (foodList) foodList.style.display = 'block';
  }
  
  // 添加排序控制区域
  if (sortControls) {
    sortControls.innerHTML = `
      <div class="sort-options">
        <label>排序方式：</label>
        <select id="sort-select">
          <option value="name-asc" ${sortField === 'name' && sortOrder === 'asc' ? 'selected' : ''}>名称 A-Z</option>
          <option value="category-asc" ${sortField === 'category' && sortOrder === 'asc' ? 'selected' : ''}>分类</option>
          <option value="score-desc" ${sortField === 'score' && sortOrder === 'desc' ? 'selected' : ''}>推荐度（高到低）</option>
        </select>
      </div>
      <div class="context-info">
        ${(() => {
          const contextLabel = getContextLabel(currentContext.context);
          if (contextLabel) {
            return `<span>当前场景：${currentContext.season} ${contextLabel}</span>`;
          } else {
            return `<span>当前场景：${currentContext.season}</span>`;
          }
        })()}
      </div>
    `;
    
    // 绑定排序事件
    document.getElementById('sort-select').addEventListener('change', (e) => {
      const [newField, newOrder] = e.target.value.split('-');
      renderFoodList(newField, newOrder);
    });
  }
  
  // 排序食物
  const sortedFoods = sortFoods(foods, sortField, sortOrder);
  
  // 渲染食物列表
  foodGrid.innerHTML = sortedFoods.map(food => {
    return `
      <div class="food-item" data-id="${food.id}">
        <div class="food-image-placeholder">
          ${food.name.charAt(0)}
        </div>
        <div class="food-info">
          <h3>${food.name}</h3>
          <div class="food-tags">
            ${food.tags ? food.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ') : ''}
          </div>
          ${food.category ? `<p class="food-category">分类：${food.category}</p>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// 获取场景中文标签
function getContextLabel(context) {
  const contextMap = {
    lunch: '午餐',
    dinner: '晚餐',
    general: '' // 通用场景不显示标签
  };
  return contextMap[context] || '';
}

// 基于模型参数的随机选择算法
function weightedRandomSelect() {
  if (foods.length === 0) {
    alert('食物数据正在加载中，请稍候重试！');
    return;
  }

  // 更新当前上下文
  currentContext = { season: getCurrentSeason(), context: getCurrentContext() };

  // 获取结果显示区域
  const resultArea = document.getElementById('foodResult');
  
  if (!resultArea) return;
  
  // 添加动画效果
  resultArea.classList.add('loading');
  
  // 根据时间段显示不同文案
  let message = '🍽️ 正在为你推荐美食...';
  const contextLabel = getContextLabel(currentContext.context);
  if (contextLabel) {
    message = '🍽️ 正在为你推荐适合' + contextLabel + '的美食...';
  }
  
  resultArea.innerHTML = '<p>' + message + '</p>';

  // 延迟显示结果，模拟思考过程
  setTimeout(() => {
    // 计算每个食物的得分（考虑当前上下文）
    const foodScores = foods.map(food => ({
      food,
      score: calculateFoodScore(food)
    }));
    
    // 使用softmax归一化，生成概率分布
    const totalExpScore = foodScores.reduce((sum, { score }) => sum + Math.exp(score), 0);
    const foodProbabilities = foodScores.map(({ food, score }) => ({
      food,
      probability: Math.exp(score) / totalExpScore
    }));
    
    // 根据概率选择食物
    const randomValue = Math.random();
    let cumulativeProbability = 0;
    let selectedFood = null;
    
    for (const { food, probability } of foodProbabilities) {
      cumulativeProbability += probability;
      if (randomValue < cumulativeProbability) {
        selectedFood = food;
        break;
      }
    }
    
    // 确保至少选择一个食物
    selectedFood = selectedFood || foods[Math.floor(Math.random() * foods.length)];

    // 更新显示内容
    resultArea.classList.remove('loading');
    
    // 构建描述文本
    let description = '';
    if (selectedFood.tags && selectedFood.tags.length > 0) {
      description = selectedFood.tags.join('，');
    }
    
    resultArea.innerHTML = `
      <div class="food-item-large">
        <div class="food-image-placeholder" style="background-color: #${Math.floor(Math.random()*16777215).toString(16)}">
          🥘
        </div>
        <h3>${selectedFood.name}</h3>
        <p class="food-description">${description}</p>
      </div>
    `;
    
    // 刷新列表，更新上下文显示
    renderFoodList();
  }, 1500);
}

// 加载数据函数
async function loadData() {
    try {
      // 更新加载状态显示
    const foodGrid = document.querySelector('.food-grid');
    if (foodGrid) {
      foodGrid.innerHTML = '<div class="loading-message"><p>📊 正在加载食物数据...</p></div>';
    } else {
      console.warn('未找到食物列表容器元素(.food-grid)');
    }
    
    // 从模型加载器获取数据
    if (modelLoader.loadModel) {
      await modelLoader.loadModel();
      foods = modelLoader.getFoodData() || [];
      modelParams = modelLoader.getModelParams() || {};
    } else {
      // 如果模型加载器不可用，尝试直接加载JSON
      console.log('开始加载JSON文件...');
      
      // 先加载food_data.json
      const foodResponse = await fetch('/data/food_data.json');
      console.log('food_data.json 响应状态:', foodResponse.status);
      if (!foodResponse.ok) {
        throw new Error('食物数据加载失败，状态码: ' + foodResponse.status);
      }
      
      const foodText = await foodResponse.text();
      console.log('成功获取food_data.json文本内容，长度:', foodText.length);
      
      try {
        foods = JSON.parse(foodText);
        console.log('food_data.json 解析成功，数据长度:', foods.length);
      } catch (jsonError) {
        console.error('解析food_data.json时出错:', jsonError);
        console.log('出错位置附近的内容:', foodText.substring(Math.max(0, jsonError.position - 50), Math.min(foodText.length, jsonError.position + 50)));
        throw new Error('解析食物数据失败: ' + jsonError.message);
      }
      
      // 再加载model_params.json
      const paramsResponse = await fetch('/data/model_params.json');
      console.log('model_params.json 响应状态:', paramsResponse.status);
      if (!paramsResponse.ok) {
        throw new Error('模型参数加载失败，状态码: ' + paramsResponse.status);
      }
      
      const paramsText = await paramsResponse.text();
      console.log('成功获取model_params.json文本内容，长度:', paramsText.length);
      
      try {
        modelParams = JSON.parse(paramsText);
        console.log('model_params.json 解析成功');
      } catch (jsonError) {
        console.error('解析model_params.json时出错:', jsonError);
        console.log('出错位置附近的内容:', paramsText.substring(Math.max(0, jsonError.position - 50), Math.min(paramsText.length, jsonError.position + 50)));
        throw new Error('解析模型参数失败: ' + jsonError.message);
      }
    }
    
    // 数据加载完成后渲染列表
    renderFoodList();
  } catch (error) {
    console.error('加载数据时出错:', error);
    alert('食物数据加载失败: ' + error.message + '，请检查控制台获取更多信息。');
  }
}

// 初始化页面
function init() {
  // 加载食物数据
  loadData();
  
  // 绑定随机按钮点击事件
  const randomBtn = document.getElementById('randomFoodBtn');
  if (randomBtn) {
    randomBtn.addEventListener('click', weightedRandomSelect);
  }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

// 初始化AOS动画
function initAOS() {
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 1000,
      easing: "ease",
      once: true,
      offset: 50,
    });
  }
}

// 当页面加载完成后初始化
window.addEventListener('DOMContentLoaded', function() {
  init();
  initAOS();
});
