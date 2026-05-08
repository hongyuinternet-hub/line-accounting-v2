# AI 記帳機器人 v2.0

## 技術架構
- LINE Bot SDK
- Anthropic Claude API（記帳分析）
- Google Apps Script（寫入 Google Sheets）
- Express + Node.js

## 環境變數
複製 `.env.example` 成 `.env` 並填入：
- LINE_CHANNEL_SECRET
- LINE_CHANNEL_ACCESS_TOKEN
- CLAUDE_API_KEY
- APPS_SCRIPT_URL

## 啟動
```
npm install
npm run dev
```
