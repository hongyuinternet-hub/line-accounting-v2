require('dotenv').config();
const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const { handleEvent } = require('./handlers/messageHandler');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);
const app = express();

// 健康檢查
app.get('/', (req, res) => {
  res.send('✅ AI 記帳機器人運行中');
});

// LINE Webhook
app.post('/webhook', middleware(config), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(event => handleEvent(event, client)));
    res.json({ success: true });
  } catch (err) {
    console.error('Webhook 錯誤:', err);
    res.status(500).end();
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ AI 記帳機器人啟動 port:${PORT}`);
});
