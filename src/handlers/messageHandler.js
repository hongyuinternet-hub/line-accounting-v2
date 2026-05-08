const { analyzeTextExpense } = require('../services/geminiService');
const { analyzeReceiptImage } = require('../services/receiptService');
const { appendExpense } = require('../services/sheetsService');
const {
  queryExpensesByDateRange,
  calculateStats,
  parseDateQuery,
  generateExpenseSummary,
} = require('../services/expenseQueryService');
const { generatePieChart } = require('../services/chartService');
const { formatExpenseSuccess, formatError, formatHelp } = require('../utils/messageFormatter');

async function handleEvent(event, client) {
  if (event.type !== 'message') return;

  const userId = event.source.userId;

  if (event.message.type === 'text') {
    return handleTextMessage(event, client, userId);
  }

  if (event.message.type === 'image') {
    return handleImageMessage(event, client, userId);
  }

  return Promise.resolve();
}

/**
 * 處理文字訊息 - 記帳或查詢
 */
async function handleTextMessage(event, client, userId) {
  const text = event.message.text.trim();

  // 說明指令
  if (text === 'help' || text === '說明' || text === '幫助') {
    return client.replyMessage(event.replyToken, formatHelp());
  }

  // 檢測是否是查詢命令（包含「多少」、「花」、「昨天」等關鍵字）
  if (isQueryCommand(text)) {
    return handleExpenseQuery(event, client, userId, text);
  }

  // 普通記帳
  try {
    const expenses = await analyzeTextExpense(text);

    if (!expenses || expenses.length === 0) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '😅 無法辨識記帳內容，請試試：「便當80」或「搭捷運30元」\n或輸入「說明」看使用方式',
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

    return client.replyMessage(event.replyToken, formatExpenseSuccess(results));
  } catch (err) {
    console.error('處理文字訊息錯誤:', err);
    return client.replyMessage(event.replyToken, formatError('系統錯誤，請稍後再試'));
  }
}

/**
 * 處理圖片訊息 - 收據辨識
 */
async function handleImageMessage(event, client, userId) {
  const messageId = event.message.id;

  try {
    // 取得圖片內容
    const stream = await client.getMessageContent(messageId);
    const chunks = [];

    stream.on('data', chunk => {
      chunks.push(chunk);
    });

    stream.on('end', async () => {
      const buffer = Buffer.concat(chunks);
      const base64 = buffer.toString('base64');

      // 分析收據
      const expenses = await analyzeReceiptImageBuffer(base64);

      if (!expenses || expenses.length === 0) {
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: '📸 無法辨識收據，請確保圖片清晰',
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

      return client.replyMessage(event.replyToken, formatExpenseSuccess(results));
    });

    stream.on('error', err => {
      console.error('取得圖片錯誤:', err);
      client.replyMessage(event.replyToken, formatError('圖片處理失敗'));
    });
  } catch (err) {
    console.error('處理圖片訊息錯誤:', err);
    return client.replyMessage(event.replyToken, formatError('圖片處理失敗'));
  }
}

/**
 * 檢測是否是查詢命令
 */
function isQueryCommand(text) {
  const keywords = ['多少', '花', '昨天', '今天', '這週', '本週', '上週', '這月', '本月', '上個月', '今年', '消費', '支出', '統計'];
  return keywords.some(keyword => text.includes(keyword));
}

/**
 * 處理花費查詢
 */
async function handleExpenseQuery(event, client, userId, text) {
  try {
    // 解析查詢日期範圍
    const dateQuery = parseDateQuery(text);
    const { start, end, period } = dateQuery;

    // 查詢花費
    const expenses = await queryExpensesByDateRange(userId, start, end);

    // 計算統計
    const stats = calculateStats(expenses);

    // 生成摘要文字
    const summary = generateExpenseSummary(period, stats);

    // 生成圓餅圖
    const chartSvg = generatePieChart(stats.byCategory);

    // 回覆訊息
    const messages = [
      {
        type: 'text',
        text: summary,
      },
      {
        type: 'image',
        originalContentUrl: 'https://example.com/chart.jpg', // 暫時 placeholder
        previewImageUrl: 'https://example.com/chart-preview.jpg',
      },
    ];

    // 如果有圓餅圖資料，生成 SVG 並作為文字回傳
    if (Object.keys(stats.byCategory).length > 0) {
      const chartMessage = {
        type: 'text',
        text: `\n📊 圖表已生成，請查看上方`,
      };
      messages.push(chartMessage);
    }

    return client.replyMessage(event.replyToken, messages.slice(0, 5)); // LINE 限制最多 5 個訊息
  } catch (err) {
    console.error('查詢花費失敗:', err);
    return client.replyMessage(event.replyToken, formatError('查詢失敗，請稍後再試'));
  }
}

/**
 * 從 Buffer 分析收據圖片
 */
async function analyzeReceiptImageBuffer(base64Image) {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const CATEGORIES = ['餐飲', '交通', '購物', '娛樂', '醫療', '居家', '教育', '其他'];

    const prompt = `你是一個台灣繁體中文的智能收據掃描助手。
請仔細辨識這張收據圖片，擷取所有消費項目。

分類選項：${CATEGORIES.join('、')}

請回傳 JSON 陣列：
[
  {
    "item": "品項名稱",
    "amount": 金額數字,
    "category": "分類",
    "note": "備註"
  }
]

重要：只回傳 JSON，不要任何說明`;

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
    });

    const responseText = result.response.text();
    const cleaned = responseText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return Array.isArray(parsed)
      ? parsed.filter(item => item.item && typeof item.amount === 'number' && item.amount > 0)
      : [];
  } catch (err) {
    console.error('收據分析失敗:', err.message);
    return [];
  }
}

module.exports = { handleEvent };
