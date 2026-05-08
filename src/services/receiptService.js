const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const CATEGORIES = ['餐飲', '交通', '購物', '娛樂', '醫療', '居家', '教育', '其他'];

/**
 * 分析收據圖片（從 LINE 的圖片消息）
 */
async function analyzeReceiptImage(imageUrl) {
  try {
    // 下載圖片
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
    });

    const base64Image = Buffer.from(response.data).toString('base64');
    const mimeType = 'image/jpeg';

    const prompt = `你是一個台灣繁體中文的智能收據掃描助手。
請仔細辨識這張收據圖片，擷取所有消費項目。

分類選項：${CATEGORIES.join('、')}

分類規則：
- 餐飲：食物、飲品、餐廳、便利店食品
- 交通：交通工具、車費、停車
- 購物：商品、衣服、日用品
- 娛樂：娛樂消費、訂閱
- 醫療：醫藥、診療
- 居家：家居用品、租金相關
- 教育：課程、書籍、文具
- 其他：無法清楚分類的項目

請回傳 JSON 陣列：
[
  {
    "item": "品項名稱",
    "amount": 金額數字,
    "category": "分類",
    "note": "備註（如：收據號碼、店家名稱）"
  }
]

重要規則：
1. 只回傳 JSON，不要任何說明文字或 markdown
2. 如果看不清或識別失敗，回傳 []
3. 識別所有單品，不要只有總計
4. 金額必須是數字，去除符號`;

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
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
    console.log('收據分析結果:', responseText);

    const cleaned = responseText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(item =>
      item.item && typeof item.amount === 'number' && item.amount > 0
    );
  } catch (err) {
    console.error('收據分析失敗:', err.message);
    return [];
  }
}

module.exports = { analyzeReceiptImage };
