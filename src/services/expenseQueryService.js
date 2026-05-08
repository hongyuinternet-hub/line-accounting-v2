const axios = require('axios');
const dayjs = require('dayjs');

/**
 * 從 Google Sheets 查詢花費資料
 */
async function queryExpensesByDateRange(userId, startDate, endDate) {
  try {
    const payload = {
      action: 'query',
      userId: userId,
      startDate: startDate.format('YYYY/MM/DD'),
      endDate: endDate.format('YYYY/MM/DD'),
    };

    const response = await axios.post(process.env.APPS_SCRIPT_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    console.log('查詢結果:', response.data);
    return response.data.expenses || [];
  } catch (err) {
    console.error('查詢失敗:', err.message);
    return [];
  }
}

/**
 * 計算總金額和分類統計
 */
function calculateStats(expenses) {
  const stats = {
    total: 0,
    byCategory: {},
    items: expenses,
  };

  expenses.forEach(expense => {
    const amount = parseFloat(expense.amount) || 0;
    stats.total += amount;

    const category = expense.category || '其他';
    stats.byCategory[category] = (stats.byCategory[category] || 0) + amount;
  });

  return stats;
}

/**
 * 解析用戶的查詢意圖（昨天、這週、這月等）
 */
function parseDateQuery(text) {
  const now = dayjs();

  if (text.includes('昨天') || text.includes('昨日')) {
    const date = now.subtract(1, 'day');
    return { start: date, end: date, period: '昨天' };
  }

  if (text.includes('今天') || text.includes('今日')) {
    return { start: now, end: now, period: '今天' };
  }

  if (text.includes('這週') || text.includes('本週')) {
    const start = now.startOf('week').add(1, 'day'); // 台灣週一開始
    const end = now.endOf('week').add(1, 'day');
    return { start, end, period: '這週' };
  }

  if (text.includes('上週')) {
    const start = now.subtract(1, 'week').startOf('week').add(1, 'day');
    const end = now.subtract(1, 'week').endOf('week').add(1, 'day');
    return { start, end, period: '上週' };
  }

  if (text.includes('這月') || text.includes('本月') || text.includes('這個月')) {
    const start = now.startOf('month');
    const end = now.endOf('month');
    return { start, end, period: '這月' };
  }

  if (text.includes('上個月')) {
    const start = now.subtract(1, 'month').startOf('month');
    const end = now.subtract(1, 'month').endOf('month');
    return { start, end, period: '上個月' };
  }

  if (text.includes('今年')) {
    const start = now.startOf('year');
    const end = now.endOf('year');
    return { start, end, period: '今年' };
  }

  // 預設：今天
  return { start: now, end: now, period: '今天' };
}

/**
 * 生成花費摘要文字
 */
function generateExpenseSummary(period, stats) {
  if (stats.items.length === 0) {
    return `📊 ${period}沒有記錄任何消費`;
  }

  const categoryText = Object.entries(stats.byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `${cat}: NT$${Math.round(amt)}`)
    .join('\n');

  const topCategory = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0];

  return `📊 ${period}花費統計
──────────────
💰 總計：NT$${Math.round(stats.total)}
📝 筆數：${stats.items.length}

分類明細：
${categoryText}

🏆 最高消費：${topCategory[0]} (NT$${Math.round(topCategory[1])})`;
}

module.exports = {
  queryExpensesByDateRange,
  calculateStats,
  parseDateQuery,
  generateExpenseSummary,
};
