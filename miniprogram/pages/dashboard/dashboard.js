// 管理后台 - 活动管理
Page({
  data: {
    // 用户信息
    userInfo: null,
    isOrganizer: false,
    
    // 统计数据
    stats: {
      totalActivities: 0,
      publishedCount: 0,
      totalRegistrations: 0,
      pendingApproval: 0
    },
    
    // 活动列表
    activities: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    
    // 当前查看的活动
    currentActivity: null,
    registrations: [],
    regLoading: false,
    
    // 弹窗
    showCreateModal: false,
    showDetailModal: false
  },
  
  onLoad() {
    this.checkAuth();
  },
  
  onShow() {
    this.checkAuth();
  },
  
  async checkAuth() {
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    
    this.setData({ 
      userInfo,
      isOrganizer: userInfo?.role === 'organizer' || userInfo?.role === 'admin'
    });
    
    if (!app.globalData.isLoggedIn) {
      // 未登录，跳转登录
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          // TODO: 跳转登录页
        }
      });
      return;
    }
    
    if (!this.data.isOrganizer) {
      // 不是主办方
      wx.showModal({
        title: '提示',
        content: '需要主办方权限才能访问',
        showCancel: false
      });
      return;
    }
    
    this.loadStats();
    this.loadActivities();
  },
  
  // 加载统计数据
  async loadStats() {
    try {
      const app = getApp();
      const res = await app.request('/users/stats');
      
      if (res.data.code === 0) {
        this.setData({ stats: res.data.data });
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  },
  
  // 加载活动列表
  async loadActivities(reset = false) {
    if (reset) {
      this.setData({ page: 1, loading: true });
    }
    
    const app = getApp();
    const { page, pageSize } = this.data;
    
    try {
      const res = await app.request({
        url: '/activities/my',
        data: { page, pageSize }
      });
      
      if (res.data.code === 0) {
        const newList = res.data.data.list;
        
        this.setData({
          activities: reset ? newList : [...this.data.activities, ...newList],
          loading: false,
          loadingMore: false,
          hasMore: newList.length >= pageSize
        });
      }
    } catch (error) {
      app.showToast('加载失败');
      this.setData({ loading: false });
    }
  },
  
  // 加载更多
  onReachBottom() {
    if (!this.data.loadingMore && this.data.hasMore) {
      this.setData({ 
        loadingMore: true, 
        page: this.data.page + 1 
      });
      this.loadActivities();
    }
  },
  
  // 刷新
  onPullDownRefresh() {
    this.loadStats();
    this.loadActivities(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },
  
  // 创建活动
  goToCreate() {
    wx.navigateTo({ url: '/pages/create-activity/create-activity' });
  },
  
  // 查看活动详情/报名列表
  async viewActivity(e) {
    const { id } = e.currentTarget.dataset;
    const activity = this.data.activities.find(a => a._id === id);
    
    this.setData({ 
      currentActivity: activity,
      showDetailModal: true,
      registrations: [],
      regLoading: true
    });
    
    this.loadRegistrations();
  },
  
  // 加载报名列表
  async loadRegistrations() {
    const app = getApp();
    const { currentActivity } = this.data;
    
    try {
      const res = await app.request(`/activities/${currentActivity._id}/registrations`);
      
      if (res.data.code === 0) {
        this.setData({
          registrations: res.data.data.list,
          regLoading: false
        });
      }
    } catch (error) {
      app.showToast('加载报名列表失败');
    }
  },
  
  // 审核报名
  async approveRegistration(e) {
    const { regId, action } = e.currentTarget.dataset;
    const app = getApp();
    
    wx.showLoading({ title: '处理中...' });
    
    try {
      const res = await app.request({
        url: `/activities/${this.data.currentActivity._id}/registrations/${regId}/approve`,
        method: 'POST'
      });
      
      wx.hideLoading();
      
      if (res.data.code === 0) {
        app.showToast('审核成功');
        this.loadRegistrations();
        this.loadStats();
      } else {
        app.showToast(res.data.message);
      }
    } catch (error) {
      wx.hideLoading();
      app.showToast('操作失败');
    }
  },
  
  // 关闭详情弹窗
  closeDetailModal() {
    this.setData({ showDetailModal: false });
  },
  
  // 发布活动
  async publishActivity(e) {
    const { id } = e.currentTarget.dataset;
    const app = getApp();
    
    wx.showModal({
      title: '确认发布',
      content: '确定要发布此活动吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '发布中...' });
          
          try {
            const res = await app.request({
              url: `/activities/${id}/publish`,
              method: 'POST'
            });
            
            wx.hideLoading();
            
            if (res.data.code === 0) {
              app.showToast('发布成功');
              this.loadActivities(true);
            } else {
              app.showToast(res.data.message);
            }
          } catch (error) {
            wx.hideLoading();
            app.showToast('发布失败');
          }
        }
      }
    });
  },
  
  // 删除活动
  async deleteActivity(e) {
    const { id } = e.currentTarget.dataset;
    const app = getApp();
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除此活动吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          
          try {
            const res = await app.request({
              url: `/activities/${id}`,
              method: 'DELETE'
            });
            
            wx.hideLoading();
            
            if (res.data.code === 0) {
              app.showToast('删除成功');
              this.loadActivities(true);
            } else {
              app.showToast(res.data.message);
            }
          } catch (error) {
            wx.hideLoading();
            app.showToast('删除失败');
          }
        }
      }
    });
  }
});
