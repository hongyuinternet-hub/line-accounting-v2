const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

const CATEGORIES = ['餐飲', '交通', '購物', '娛樂', '醫療', '居家', '教育', '其他'];

/**
 * 分析文字記帳訊息
 */
async function analyzeTextExpense(text) {
  const prompt = `你是一個台灣繁體中文的智能記帳助手。
請從以下使用者輸入中，擷取所有消費項目。

使用者輸入：「${text}」

分類選項：${CATEGORIES.join('、')}

分類規則：
- 餐飲：便當、餐廳、小吃、飲料、咖啡、早午晚餐、超商食品
- 交通：捷運、公車、計程車、Uber、加油、停車費、過路費
- 購物：衣服、鞋子、3C、日用品、超市、網購、百貨
- 娛樂：電影、KTV、遊戲、訂閱
- 醫療：藥局、診所、牙醫、健身房、保健食品
- 居家：租金、電費、水費、瓦斯、網路費、家具
- 教育：書籍、課程、補習班、文具
- 其他：無法分類的項目

請只回傳 JSON 陣列，每筆消費一個物件：
[
  {
    "item": "品項名稱（精簡，10字內）",
    "amount": 金額數字,
    "category": "分類",
    "note": "備註（可空字串）"
  }
]

重要：
1. 只回傳純 JSON，不要任何說明、不要 markdown 格式
2. 如果無法辨識記帳內容（如一般對話），回傳空陣列 []
3. 金額去除貨幣符號（$、元、NT$）`;

  try {
    console.log('Gemini API Key:', process.env.GEMINI_API_KEY ? '✅ 已設定' : '❌ 未設定');

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    console.log('Gemini 回應:', responseText);

    const cleaned = responseText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(item =>
      item.item && typeof item.amount === 'number' && item.amount > 0
    );
  } catch (err) {
    console.error('Gemini 分析失敗:', err.message);
    return [];
  }
}

module.exports = { analyzeTextExpense };