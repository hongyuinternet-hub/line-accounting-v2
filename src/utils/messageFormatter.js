function formatExpenseSuccess(expenses) {
  if (expenses.length === 1) {
    const e = expenses[0];
    const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
    return {
      type: 'text',
      text: `✅ 記帳成功！\n──────────\n📅 ${today}\n📝 ${e.item}｜NT$${e.amount}\n📂 ${e.category}${e.note ? '\n💭 ' + e.note : ''}`,
    };
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const items = expenses.map(e => `• ${e.item} NT$${e.amount}（${e.category}）`).join('\n');

  return {
    type: 'text',
    text: `✅ 已記錄 ${expenses.length} 筆消費\n──────────\n${items}\n──────────\n💰 合計：NT$${total}`,
  };
}

function formatError(message) {
  return {
    type: 'text',
    text: `❌ ${message}`,
  };
}

function formatHelp() {
  return {
    type: 'text',
    text: `📚 使用說明\n──────────\n💬 直接輸入：\n• 便當80\n• 星巴克咖啡150\n• 搭捷運30元\n\n💡 多筆同時：\n• 早餐50，午餐80，飲料40\n\n🏷️ 自動分類：\n餐飲、交通、購物、娛樂、醫療、居家、教育、其他`,
  };
}

module.exports = {
  formatExpenseSuccess,
  formatError,
  formatHelp,
};
