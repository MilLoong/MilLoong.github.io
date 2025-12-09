// whattoeat.js - 吃什么页面交互逻辑

// 硬编码的食品数据
const foods = [
  {
    id: '1',
    name: '红烧肉',
    description: '经典中华美食，肥而不腻，入口即化',
    parameters: { price: 3, taste: 5, health: 2, cookTime: 4, favorite: 5 },
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: '宫保鸡丁',
    description: '麻辣鲜香，开胃下饭，配以花生增添口感',
    parameters: { price: 2, taste: 4, health: 3, cookTime: 3, favorite: 4 },
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    name: '蔬菜沙拉',
    description: '新鲜蔬菜，健康轻食，营养均衡',
    parameters: { price: 1, taste: 3, health: 5, cookTime: 1, favorite: 3 },
    createdAt: new Date().toISOString()
  },
  {
    id: '4',
    name: '蛋炒饭',
    description: '简单快捷，家常美味，饱腹感强',
    parameters: { price: 1, taste: 4, health: 3, cookTime: 2, favorite: 4 },
    createdAt: new Date().toISOString()
  },
  {
    id: '5',
    name: '番茄鸡蛋面',
    description: '酸甜可口，家常面食，制作简单',
    parameters: { price: 1, taste: 4, health: 4, cookTime: 2, favorite: 5 },
    createdAt: new Date().toISOString()
  },
  {
    id: '6',
    name: '麻婆豆腐',
    description: '麻辣鲜香，豆腐嫩滑，下饭神器',
    parameters: { price: 2, taste: 5, health: 3, cookTime: 2, favorite: 5 },
    createdAt: new Date().toISOString()
  }
];

// 固定参数权重设置
const paramWeights = {
  price: 1,       // 价格因素权重 (1-5, 1=价格越低优先级越高)
  taste: 3,       // 口味偏好权重 (1-5, 5=越喜欢)
  health: 2,      // 健康指数权重 (1-5, 5=越健康优先级越高)
  cookTime: 1,    // 烹饪时间权重 (1-5, 1=时间越短优先级越高)
  favorite: 5     // 喜爱程度权重 (1-5, 5=越喜欢)
};

// 计算食物的加权分数
function calculateFoodScore(food) {
  const { parameters } = food;
  let score = 0;
  
  // 价格：价格越低分数越高
  score += (6 - parameters.price) * paramWeights.price;
  
  // 口味：越喜欢分数越高
  score += parameters.taste * paramWeights.taste;
  
  // 健康：越健康分数越高
  score += parameters.health * paramWeights.health;
  
  // 烹饪时间：时间越短分数越高
  score += (6 - parameters.cookTime) * paramWeights.cookTime;
  
  // 喜爱程度：越喜欢分数越高
  score += parameters.favorite * paramWeights.favorite;
  
  return score;
}

// 当前排序方式
let currentSort = { field: 'createdAt', order: 'desc' };

// 排序食物列表
function sortFoods(foodsArray, sortField, sortOrder) {
  return [...foodsArray].sort((a, b) => {
    let aValue, bValue;
    
    // 根据排序字段获取值
    if (sortField === 'createdAt') {
      aValue = new Date(a[sortField]).getTime();
      bValue = new Date(b[sortField]).getTime();
    } else if (sortField === 'name') {
      aValue = a[sortField].toLowerCase();
      bValue = b[sortField].toLowerCase();
    } else {
      // 参数字段
      aValue = a.parameters[sortField];
      bValue = b.parameters[sortField];
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
        <h3>还没有添加任何食物</h3>
        <p>请在上方添加您喜欢的美食，然后开始随机选择！</p>
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
          <option value="createdAt-desc" ${sortField === 'createdAt' && sortOrder === 'desc' ? 'selected' : ''}>最新添加</option>
          <option value="createdAt-asc" ${sortField === 'createdAt' && sortOrder === 'asc' ? 'selected' : ''}>最早添加</option>
          <option value="name-asc" ${sortField === 'name' && sortOrder === 'asc' ? 'selected' : ''}>名称 A-Z</option>
          <option value="taste-desc" ${sortField === 'taste' && sortOrder === 'desc' ? 'selected' : ''}>口味评分（高到低）</option>
          <option value="favorite-desc" ${sortField === 'favorite' && sortOrder === 'desc' ? 'selected' : ''}>喜爱程度（高到低）</option>
          <option value="health-desc" ${sortField === 'health' && sortOrder === 'desc' ? 'selected' : ''}>健康指数（高到低）</option>
          <option value="price-asc" ${sortField === 'price' && sortOrder === 'asc' ? 'selected' : ''}>价格（低到高）</option>
        </select>
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
    const { parameters } = food;
    return `
      <div class="food-item" data-id="${food.id}">
        <div class="food-image-placeholder">
          ${food.name.charAt(0)}
        </div>
        <div class="food-info">
          <h3>${food.name}</h3>
          <p>${food.description}</p>
          <div class="food-params">
            <span class="param-tag">价格: ${parameters.price}/5</span>
            <span class="param-tag">口味: ${parameters.taste}/5</span>
            <span class="param-tag">健康: ${parameters.health}/5</span>
            <span class="param-tag">时间: ${parameters.cookTime}/5</span>
            <span class="param-tag">喜爱: ${parameters.favorite}/5</span>
          </div>
        </div>
        <!-- 移除删除按钮 -->
      </div>
    `;
  }).join('');
}

// 基于参数权重的随机选择算法
function weightedRandomSelect() {
  if (foods.length === 0) {
    alert('请先添加一些食物！');
    return;
  }

  // 获取结果显示区域
  const resultArea = document.getElementById('foodResult');
  
  if (!resultArea) return;
  
  // 添加动画效果
  resultArea.classList.add('loading');
  resultArea.innerHTML = '<p>🍽️ 正在为你寻找美食...</p>';

  // 延迟显示结果，模拟思考过程
  setTimeout(() => {
    // 计算每个食物的得分
    const foodScores = foods.map(food => ({
      food,
      score: calculateFoodScore(food)
    }));
    
    // 找出最高分数
    const maxScore = Math.max(...foodScores.map(item => item.score));
    
    // 根据分数创建权重数组
    // 分数越高，被选中的概率越大
    let weightedPool = [];
    foodScores.forEach(({ food, score }) => {
      // 归一化分数，最高分为10份，其他按比例分配
      const weight = Math.max(1, Math.round((score / maxScore) * 10));
      // 根据权重将食物添加到池中多次
      for (let i = 0; i < weight; i++) {
        weightedPool.push(food);
      }
    });
    
    // 从加权池中随机选择一个食物
    const randomIndex = Math.floor(Math.random() * weightedPool.length);
    const selectedFood = weightedPool[randomIndex];

    // 更新显示内容
    resultArea.classList.remove('loading');
    resultArea.innerHTML = `
      <div class="food-item-large">
        <div class="food-image-placeholder" style="background-color: #${Math.floor(Math.random()*16777215).toString(16)}">
          🥘
        </div>
        <h3>${selectedFood.name}</h3>
        <p>${selectedFood.description || ''}</p>
      </div>
    `;
  }, 1500);
}

// 初始化页面
function init() {
  // 渲染食物列表
  renderFoodList();
  
  // 绑定随机按钮点击事件
  const randomBtn = document.getElementById('randomFoodBtn');
  if (randomBtn) {
    randomBtn.addEventListener('click', weightedRandomSelect);
  }
  
  // 移除权重滑块事件绑定，使用固定权重
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
