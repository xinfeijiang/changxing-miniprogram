// 签到页面
Page({
  data: {
    registration: null,
    activity: null,
    loading: true,
    userInfo: null
  },
  
  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadTicket();
    }
    
    const app = getApp();
    this.setData({ userInfo: app.globalData.userInfo });
  },
  
  async loadTicket() {
    const app = getApp();
    
    try {
      const res = await app.request(`/registrations/${this.data.id}/ticket`);
      
      if (res.data.code === 0) {
        this.setData({
          registration: res.data.data,
          activity: res.data.data.activity,
          loading: false
        });
        
        wx.setNavigationBarTitle({
          title: res.data.data.activity.title
        });
      } else {
        app.showToast(res.data.message);
      }
    } catch (error) {
      app.showToast('加载失败');
    }
  },
  
  // 刷新
  onPullDownRefresh() {
    this.loadTicket().finally(() => {
      wx.stopPullDownRefresh();
    });
  },
  
  // 预览二维码（实际应该调用小程序的生成二维码能力）
  previewQRCode() {
    // 这里展示签到码，实际项目中可以用 wx.canvasToTempFilePath 生成二维码图片
    wx.showModal({
      title: '签到码',
      content: `您的签到码：${this.data.registration.ticketCode}`,
      showCancel: false
    });
  },
  
  // 复制签到码
  copyCode() {
    wx.setClipboardData({
      data: this.data.registration.ticketCode,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  }
});
