/**
 * 生成分類圓餅圖 SVG
 */
function generatePieChart(categoryStats) {
  // 顏色配置
  const colors = {
    餐飲: '#FF6B6B',
    交通: '#4ECDC4',
    購物: '#45B7D1',
    娛樂: '#FFA07A',
    醫療: '#98D8C8',
    居家: '#F7DC6F',
    教育: '#BB8FCE',
    其他: '#85C1E2',
  };

  // 計算圓餅比例
  const total = Object.values(categoryStats).reduce((a, b) => a + b, 0);
  if (total === 0) return generateEmptyChart();

  const slices = Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / total) * 100,
      color: colors[category] || '#95A5A6',
    }));

  // 圓餅圖參數
  const width = 800;
  const height = 600;
  const centerX = width / 2;
  const centerY = height / 2.5;
  const radius = 120;

  // 計算路徑
  let currentAngle = -90; // 從上方開始
  const paths = [];
  const labels = [];

  slices.forEach((slice, index) => {
    const sliceAngle = (slice.percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    // 轉換為弧度
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // 計算起點和終點
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    // 大弧標誌
    const largeArc = sliceAngle > 180 ? 1 : 0;

    // 路徑
    const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    paths.push({
      d: path,
      fill: slice.color,
      category: slice.category,
      percentage: slice.percentage,
    });

    // 標籤位置（圓上外側）
    const labelAngle = (startAngle + endAngle) / 2;
    const labelRad = (labelAngle * Math.PI) / 180;
    const labelX = centerX + (radius + 50) * Math.cos(labelRad);
    const labelY = centerY + (radius + 50) * Math.sin(labelRad);

    labels.push({
      x: labelX,
      y: labelY,
      text: `${slice.category} ${slice.percentage.toFixed(1)}%`,
      color: slice.color,
    });

    currentAngle += sliceAngle;
  });

  // 生成 SVG
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .title { font-size: 28px; font-weight: bold; fill: #333; }
      .label { font-size: 14px; fill: #333; text-anchor: middle; }
      .legend { font-size: 12px; fill: #666; }
    </style>
    
    <text x="${width / 2}" y="40" class="title" text-anchor="middle">分類消費統計</text>`;

  // 繪製圓餅
  paths.forEach(p => {
    svg += `<path d="${p.d}" fill="${p.fill}" stroke="white" stroke-width="2"/>`;
  });

  // 繪製標籤
  labels.forEach(label => {
    svg += `<text x="${label.x}" y="${label.y}" class="label">${label.text}</text>`;
  });

  // 繪製圖例
  let legendY = height - 80;
  slices.forEach((slice, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col * 350 + 50;
    const y = legendY + row * 25;

    svg += `<rect x="${x}" y="${y - 12}" width="15" height="15" fill="${slice.color}"/>`;
    svg += `<text x="${x + 25}" y="${y}" class="legend">${slice.category}: NT$${Math.round(slice.amount)}</text>`;
  });

  svg += `</svg>`;

  return svg;
}

/**
 * 生成空的圓餅圖
 */
function generateEmptyChart() {
  return `<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
    <style>
      .title { font-size: 24px; font-weight: bold; fill: #999; }
      .message { font-size: 18px; fill: #999; }
    </style>
    <text x="400" y="150" class="title" text-anchor="middle">暫無消費記錄</text>
    <text x="400" y="200" class="message" text-anchor="middle">開始記帳吧！</text>
  </svg>`;
}

/**
 * 將 SVG 轉換為 Buffer（供後續使用）
 */
function svgToBuffer(svg) {
  return Buffer.from(svg, 'utf-8');
}

module.exports = {
  generatePieChart,
  generateEmptyChart,
  svgToBuffer,
};
