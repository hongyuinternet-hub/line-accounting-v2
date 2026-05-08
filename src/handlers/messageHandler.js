const { analyzeTextExpense } = require('../services/geminiService');
const { appendExpense } = require('../services/sheetsService');
const { formatExpenseSuccess, formatError, formatHelp } = require('../utils/messageFormatter');

console.log('✅ messageHandler.js 載入成功');

async function handleEvent(event, client) {
  console.log('事件收到:', event.type);
  if (event.type !== 'message') return;
  
  const userId = event.source.userId;
  const text = event.message.text?.trim() || '';
  
  console.log('訊息:', text);
  
  // 暫時只做記帳
  try {
    const expenses = await analyzeTextExpense(text);
    if (!expenses || expenses.length === 0) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '無法辨識內容'
      });
    }
    
    const results = [];
    for (const expense of expenses) {
      await appendExpense(userId, expense);
      results.push(expense);
    }
    
    return client.replyMessage(event.replyToken, formatExpenseSuccess(results));
  } catch (err) {
    console.error('錯誤:', err);
    return client.replyMessage(event.replyToken, formatError('系統錯誤'));
  }
}

module.exports = { handleEvent };