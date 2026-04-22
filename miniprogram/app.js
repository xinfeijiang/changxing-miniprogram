// 畅行活动报名小程序 - App 配置
App({
  globalData: {
    // API 基础地址
    apiBaseUrl: 'http://localhost:3000/api',
    
    // 用户信息
    userInfo: null,
    
    // 登录态
    isLoggedIn: false,
    
    // 系统信息
    systemInfo: null,
    statusBarHeight: 0,
    navigationBarHeight: 44
  },
  
  onLaunch() {
    // 获取系统信息
    this.getSystemInfo();
    
    // 检查登录状态
    this.checkLoginStatus();
  },
  
  // 获取系统信息
  getSystemInfo() {
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;
    this.globalData.statusBarHeight = systemInfo.statusBarHeight;
  },
  
  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      this.globalData.isLoggedIn = true;
      this.globalData.userInfo = userInfo;
    }
  },
  
  // 微信登录
  wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: res => {
          if (res.code) {
            // 将 code 发送到后端
            this.requestLogin(res.code).then(resolve).catch(reject);
          } else {
            reject(new Error('登录失败：' + res.errMsg));
          }
        },
        fail: reject
      });
    });
  },
  
  // 请求登录
  async requestLogin(code) {
    try {
      const res = await wx.request({
        url: `${this.globalData.apiBaseUrl}/auth/wx-login`,
        method: 'POST',
        data: { code }
      });
      
      if (res.data.code === 0) {
        const { token, user } = res.data.data;
        wx.setStorageSync('token', token);
        wx.setStorageSync('userInfo', user);
        this.globalData.isLoggedIn = true;
        this.globalData.userInfo = user;
        return user;
      } else {
        throw new Error(res.data.message || '登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  },
  
  // 登出
  logout() {
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    this.globalData.isLoggedIn = false;
    this.globalData.userInfo = null;
  },
  
  // 发起请求的封装
  request(options) {
    const token = wx.getStorageSync('token');
    
    return wx.request({
      ...options,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.header
      },
      url: options.url.startsWith('http') ? options.url : `${this.globalData.apiBaseUrl}${options.url}`
    });
  },
  
  // 提示 toast
  showToast(title, icon = 'none') {
    wx.showToast({ title, icon });
  },
  
  // 加载 loading
  showLoading(title = '加载中...') {
    wx.showLoading({ title, mask: true });
  },
  
  hideLoading() {
    wx.hideLoading();
  },
  
  // 模态框
  showModal(title, content) {
    return new Promise((resolve) => {
      wx.showModal({
        title,
        content,
        showCancel: false,
        success: () => resolve()
      });
    });
  }
});
