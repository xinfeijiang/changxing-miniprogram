// 分享海报页面
const app = getApp();

Page({
  data: {
    activity: null,
    posterUrl: '',
    generating: true,
    saved: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ activityId: options.id });
      this.loadActivity();
    }
  },

  async loadActivity() {
    try {
      const res = await app.request(`/activities/${this.data.activityId}`);
      if (res.data.code === 0) {
        this.setData({ activity: res.data.data });
        // 延迟生成海报，确保页面渲染完成
        setTimeout(() => {
          this.generatePoster();
        }, 500);
      }
    } catch (error) {
      app.showToast('加载失败');
    }
  },

  // 生成海报
  async generatePoster() {
    try {
      this.setData({ generating: true });

      // 获取小程序码
      const qrRes = await app.request({
        url: '/wechat/wxa-code',
        method: 'POST',
        data: {
          path: `pages/activity-detail/activity-detail?id=${this.data.activityId}`,
          width: 280
        }
      });

      if (qrRes.data.code !== 0) {
        throw new Error('获取小程序码失败');
      }

      const qrCodeUrl = qrRes.data.data;

      // 使用 Canvas 绘制海报
      const posterData = await this.drawPoster(qrCodeUrl);
      this.setData({
        posterUrl: posterData,
        generating: false
      });

    } catch (error) {
      console.error('生成海报失败:', error);
      app.showToast('生成失败');
      this.setData({ generating: false });
    }
  },

  // 绘制海报
  drawPoster(qrCodeUrl) {
    return new Promise((resolve, reject) => {
      const ctx = wx.createCanvasContext('poster-canvas', this);
      const W = 600;
      const H = 900;

      // 背景色
      ctx.setFillStyle('#ffffff');
      ctx.fillRect(0, 0, W, H);

      // 顶部图片区域（封面）
      const coverUrl = this.data.activity.cover;
      if (coverUrl) {
        ctx.drawImage(coverUrl, 0, 0, W, 300);
      } else {
        ctx.setFillStyle('#4A90E2');
        ctx.fillRect(0, 0, W, 300);
      }

      // 标题区域背景
      ctx.setFillStyle('#ffffff');
      ctx.fillRect(20, 280, W - 40, 80);
      
      // 标题
      ctx.setFillStyle('#333333');
      ctx.setFontSize(32);
      ctx.setTextAlign('left');
      const title = this.data.activity.title;
      const titleLines = this.wrapText(title, W - 60, 36);
      titleLines.slice(0, 2).forEach((line, i) => {
        ctx.fillText(line, 30, 320 + i * 40);
      });

      // 时间图标和文字
      ctx.setFillStyle('#666666');
      ctx.setFontSize(24);
      ctx.fillText('📅', 30, 390);
      ctx.fillText(this.formatTime(this.data.activity.startTime), 65, 390);

      // 地点图标和文字
      ctx.fillText('📍', 30, 430);
      const location = this.data.activity.location || '待定';
      ctx.fillText(location.substring(0, 20), 65, 430);

      // 人数/费用信息
      if (this.data.activity.maxParticipants) {
        ctx.fillText('👥', 30, 470);
        const count = `${this.data.activity.registrationCount || 0}/${this.data.activity.maxParticipants}人已报名`;
        ctx.fillText(count, 65, 470);
      }

      if (this.data.activity.fee > 0) {
        ctx.setFillStyle('#FF6B6B');
        ctx.setFontSize(36);
        ctx.fillText(`¥${this.data.activity.fee}`, 30, 520);
      } else {
        ctx.setFillStyle('#52C41A');
        ctx.setFontSize(32);
        ctx.fillText('免费活动', 30, 520);
      }

      // 分割线
      ctx.setStrokeStyle('#eeeeee');
      ctx.beginPath();
      ctx.moveTo(30, 560);
      ctx.lineTo(W - 30, 560);
      ctx.stroke();

      // 小程序码区域
      ctx.setFillStyle('#f8f8f8');
      ctx.fillRect(100, 590, W - 200, 240);
      
      // 下载并绘制小程序码
      wx.downloadFile({
        url: qrCodeUrl,
        success: (res) => {
          if (res.statusCode === 200) {
            ctx.drawImage(res.tempFilePath, 160, 610, 280, 220);
          }
          ctx.draw(false, () => {
            setTimeout(() => {
              wx.canvasToTempFilePath({
                canvasId: 'poster-canvas',
                success: (result) => {
                  resolve(result.tempFilePath);
                },
                fail: reject
              }, this);
            }, 500);
          });
        },
        fail: () => {
          // 如果下载失败，绘制占位符
          ctx.setFillStyle('#cccccc');
          ctx.fillRect(160, 610, 280, 220);
          ctx.setFillStyle('#666666');
          ctx.setFontSize(24);
          ctx.setTextAlign('center');
          ctx.fillText('长按识别二维码', W / 2, 740);
          
          ctx.draw(false, () => {
            setTimeout(() => {
              wx.canvasToTempFilePath({
                canvasId: 'poster-canvas',
                success: (result) => {
                  resolve(result.tempFilePath);
                },
                fail: reject
              }, this);
            }, 500);
          });
        }
      });
    });
  },

  // 文本换行处理
  wrapText(text, maxWidth, fontSize) {
    const chars = text.split('');
    let line = '';
    const lines = [];
    for (let i = 0; i < chars.length; i++) {
      const testLine = line + chars[i];
      // 估算宽度
      const width = testLine.length * fontSize * 0.6;
      if (width > maxWidth && line !== '') {
        lines.push(line);
        line = chars[i];
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    return lines;
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return '待定';
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    return `${month}月${day}日 ${hour}:${minute.toString().padStart(2, '0')}`;
  },

  // 保存到相册
  savePoster() {
    const { posterUrl } = this.data;
    
    wx.saveImageToPhotosAlbum({
      filePath: posterUrl,
      success: () => {
        app.showToast('已保存到相册');
        this.setData({ saved: true });
      },
      fail: (err) => {
        if (err.errMsg.includes('auth deny')) {
          wx.openSetting();
        } else {
          app.showToast('保存失败');
        }
      }
    });
  },

  // 预览海报
  previewPoster() {
    wx.previewImage({
      urls: [this.data.posterUrl]
    });
  },

  // 重新生成
  regenerate() {
    this.generatePoster();
  },

  // 分享给朋友
  onShareAppMessage() {
    const { activity } = this.data;
    return {
      title: activity.title,
      path: `/pages/activity-detail/activity-detail?id=${activity.id}`,
      imageUrl: activity.cover
    };
  }
});
