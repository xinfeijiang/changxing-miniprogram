// 海报生成服务
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');

// 生成活动分享海报
async function generateActivityPoster(activity, qrCodeUrl) {
  const width = 750;
  const height = 1200;
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // 背景渐变
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#191A1F');
  gradient.addColorStop(1, '#24262E');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // 顶部装饰
  const topGradient = ctx.createLinearGradient(0, 0, width, 300);
  topGradient.addColorStop(0, 'rgba(138, 180, 248, 0.3)');
  topGradient.addColorStop(1, 'rgba(197, 138, 249, 0.1)');
  ctx.fillStyle = topGradient;
  ctx.fillRect(0, 0, width, 300);
  
  // 标题
  ctx.fillStyle = '#E8EAED';
  ctx.font = 'bold 36px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  
  // 文字换行处理
  const title = activity.title;
  const maxWidth = width - 80;
  const lineHeight = 48;
  let y = 180;
  
  // 标题背景
  ctx.fillStyle = 'rgba(138, 180, 248, 0.1)';
  roundRect(ctx, 40, 120, width - 80, 100, 16);
  ctx.fill();
  
  // 绘制标题
  ctx.fillStyle = '#E8EAED';
  ctx.font = 'bold 36px "PingFang SC", "Microsoft YaHei", sans-serif';
  drawText(ctx, title, width / 2, y, maxWidth, lineHeight);
  
  // 封面图
  if (activity.cover) {
    try {
      const img = await loadImage(activity.cover);
      const imgWidth = width - 80;
      const imgHeight = (img.height / img.width) * imgWidth;
      const imgY = 280;
      
      // 封面圆角
      ctx.save();
      roundRect(ctx, 40, imgY, imgWidth, Math.min(imgHeight, 400), 20);
      ctx.clip();
      ctx.drawImage(img, 40, imgY, imgWidth, Math.min(imgHeight, 400));
      ctx.restore();
    } catch (e) {
      // 封面加载失败，使用占位
      ctx.fillStyle = '#2D3039';
      roundRect(ctx, 40, 280, width - 80, 300, 20);
      ctx.fill();
      ctx.fillStyle = '#5F6368';
      ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText('活动封面', width / 2, 440);
    }
  }
  
  // 信息卡片
  const cardY = 720;
  ctx.fillStyle = '#24262E';
  roundRect(ctx, 40, cardY, width - 80, 300, 20);
  ctx.fill();
  
  // 时间
  ctx.fillStyle = '#E8EAED';
  ctx.font = '28px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('📅 ' + (activity.startTime || ''), 70, cardY + 60);
  
  // 地点
  ctx.fillText('📍 ' + (activity.location || ''), 70, cardY + 120);
  
  // 名额
  const spotsText = `🎫 剩余 ${activity.spotsLeft} / ${activity.totalSpots} 名额`;
  ctx.fillText(spotsText, 70, cardY + 180);
  
  // 价格
  const priceText = activity.price === 0 ? '💰 免费' : `💰 ¥${activity.price}`;
  ctx.fillText(priceText, 70, cardY + 240);
  
  // 二维码区域
  ctx.fillStyle = '#191A1F';
  roundRect(ctx, width / 2 - 100, 1060, 200, 200, 16);
  ctx.fill();
  
  // 二维码（如果有）
  if (qrCodeUrl) {
    try {
      const qrImg = await loadImage(qrCodeUrl);
      ctx.drawImage(qrImg, width / 2 - 80, 1080, 160, 160);
    } catch (e) {
      ctx.fillStyle = '#5F6368';
      ctx.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('扫码报名', width / 2, 1170);
    }
  }
  
  // 底部提示
  ctx.fillStyle = '#9AA0A6';
  ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('长按识别二维码 · 畅行活动报名', width / 2, 1100);
  
  // 返回图片Buffer
  return canvas.toBuffer('image/png');
}

// 绘制圆角矩形
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// 绘制换行文字
function drawText(ctx, text, x, y, maxWidth, lineHeight) {
  const lines = [];
  let line = '';
  
  for (let i = 0; i < text.length; i++) {
    const testLine = line + text[i];
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && i > 0) {
      lines.push(line);
      line = text[i];
    } else {
      line = testLine;
    }
  }
  lines.push(line);
  
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }
}

// 生成签到凭证海报
async function generateTicketPoster(registration, activity) {
  const width = 600;
  const height = 900;
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // 背景
  ctx.fillStyle = '#191A1F';
  ctx.fillRect(0, 0, width, height);
  
  // 渐变头部
  const gradient = ctx.createLinearGradient(0, 0, width, 200);
  gradient.addColorStop(0, '#8AB4F8');
  gradient.addColorStop(1, '#C58AF9');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, 200);
  
  // 标题
  ctx.fillStyle = '#191A1F';
  ctx.font = 'bold 32px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('活动门票', width / 2, 80);
  
  // 活动名称
  ctx.fillStyle = '#E8EAED';
  ctx.font = 'bold 28px "PingFang SC", "Microsoft YaHei", sans-serif';
  const title = activity.title;
  drawTextCenter(ctx, title, width / 2, 240, width - 80, 40);
  
  // 签到码区域
  ctx.fillStyle = '#24262E';
  roundRect(ctx, 50, 350, width - 100, 200, 16);
  ctx.fill();
  
  // 签到码
  ctx.fillStyle = '#8AB4F8';
  ctx.font = 'bold 56px "SF Mono", monospace';
  ctx.fillText(registration.ticketCode, width / 2, 450);
  
  // 提示
  ctx.fillStyle = '#9AA0A6';
  ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('请出示此码签到', width / 2, 500);
  
  // 信息
  ctx.textAlign = 'left';
  ctx.fillStyle = '#E8EAED';
  ctx.font = '26px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('📅 ' + activity.startTime, 50, 620);
  ctx.fillText('📍 ' + activity.location, 50, 670);
  ctx.fillText('🎫 订单号：' + registration.orderId, 50, 720);
  
  // 状态
  const statusColor = registration.status === 'confirmed' ? '#81C995' : '#FDD663';
  ctx.fillStyle = statusColor;
  ctx.font = 'bold 24px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(registration.status === 'confirmed' ? '✓ 已确认' : '⏳ 待审核', 50, 780);
  
  return canvas.toBuffer('image/png');
}

// 居中绘制文字
function drawTextCenter(ctx, text, x, y, maxWidth, lineHeight) {
  const lines = [];
  let line = '';
  
  for (let i = 0; i < text.length; i++) {
    const testLine = line + text[i];
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && i > 0) {
      lines.push(line);
      line = text[i];
    } else {
      line = testLine;
    }
  }
  lines.push(line);
  
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }
}

module.exports = {
  generateActivityPoster,
  generateTicketPoster
};
