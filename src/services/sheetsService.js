const axios = require('axios');
const dayjs = require('dayjs');

/**
 * 寫入一筆記帳資料到 Google Sheets（透過 Apps Script）
 */
async function appendExpense(userId, expense) {
  const today = dayjs().format('YYYY/MM/DD');

  const payload = {
    item: expense.item,
    amount: expense.amount,
    category: expense.category,
    note: expense.note || '',
    userId: userId,
  };

  try {
    const response = await axios.post(process.env.APPS_SCRIPT_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    console.log('寫入 Google Sheet 成功:', response.data);
    return { date: today, ...expense };
  } catch (err) {
    console.error('寫入 Google Sheet 失敗:', err.message);
    throw new Error('記帳失敗，請稍後再試');
  }
}

module.exports = { appendExpense };
