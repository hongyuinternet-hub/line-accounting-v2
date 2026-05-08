const { analyzeTextExpense } = require('../services/claudeService');
const { appendExpense } = require('../services/sheetsService');
const { formatExpenseSuccess, formatError, formatHelp } = require('../utils/messageFormatter');

async function handleEvent(event, client) {
  if (event.type !== 'message') return;

  const userId = event.source.userId;

  if (event.message.type === 'text') {
    return handleTextMessage(event, client, userId);
  }

  // 暫不處理圖片（可以之後加上）
  return Promise.resolve();
}

async function handleTextMessage(event, client, userId) {
  const text = event.message.text.trim();

  // 處理指令
  if (text === 'help' || text === '說明' || text === '幫助') {
    return client.replyMessage(event.replyToken, formatHelp());
  }

  try {
    // 用 Claude 分析記帳內容
    const expenses = await analyzeTextExpense(text);

    if (!expenses || expenses.length === 0) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '😅 無法辨識記帳內容，請試試：「便當80」或「搭捷運30元」',
      });
    }

    // 寫入 Google Sheet
    const results = [];
    for (const expense of expenses) {
      try {
        await appendExpense(userId, expense);
        results.push(expense);
      } catch (err) {
        console.error('寫入失敗:', err);
      }
    }

    if (results.length === 0) {
      return client.replyMessage(event.replyToken, formatError('記帳失敗，請稍後再試'));
    }

    // 回覆成功訊息
    return client.replyMessage(event.replyToken, formatExpenseSuccess(results));
  } catch (err) {
    console.error('處理文字訊息錯誤:', err);
    return client.replyMessage(event.replyToken, formatError('系統錯誤，請稍後再試'));
  }
}

module.exports = { handleEvent };
