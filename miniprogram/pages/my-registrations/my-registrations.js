// 我的报名页面
Page({
  data: {
    activeTab: 'all',
    registrations: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    
    // 筛选tabs
    tabs: [
      { id: 'all', name: '全部', count: 0 },
      { id: 'pending', name: '待审核', count: 0 },
      { id: 'confirmed', name: '已确认', count: 0 },
      { id: 'checked-in', name: '已签到', count: 0 },
      { id: 'cancelled', name: '已取消', count: 0 }
    ]
  },
  
  onLoad() {
    this.loadRegistrations();
  },
  
  onShow() {
    // 刷新数据
    this.setData({ page: 1 });
    this.loadRegistrations(true);
  },
  
  // 切换标签
  onTabChange(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ 
      activeTab: id, 
      page: 1,
      registrations: [],
      loading: true
    });
    this.loadRegistrations(true);
  },
  
  // 加载报名列表
  async loadRegistrations(reset = false) {
    if (reset) {
      this.setData({ page: 1, loading: true });
    }
    
    const app = getApp();
    const { page, pageSize, activeTab } = this.data;
    
    try {
      const res = await app.request({
        url: '/registrations/my',
        data: {
          page,
          pageSize,
          status: activeTab === 'all' ? '' : activeTab
        }
      });
      
      if (res.data.code === 0) {
        const newList = res.data.data.list;
        
        this.setData({
          registrations: reset ? newList : [...this.data.registrations, ...newList],
          loading: false,
          loadingMore: false,
          hasMore: newList.length >= pageSize,
          [`tabs[${this.getTabIndex()}].count`]: res.data.data.total
        });
      }
    } catch (error) {
      app.showToast('加载失败');
      this.setData({ loading: false });
    }
  },
  
  getTabIndex() {
    return this.data.tabs.findIndex(t => t.id === this.data.activeTab);
  },
  
  // 加载更多
  onReachBottom() {
    if (!this.data.loadingMore && this.data.hasMore) {
      this.setData({ 
        loadingMore: true, 
        page: this.data.page + 1 
      });
      this.loadRegistrations();
    }
  },
  
  // 下拉刷新
  onPullDownRefresh() {
    this.loadRegistrations(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },
  
  // 跳转活动详情
  goToActivity(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/activity-detail/activity-detail?id=${id}` });
  },
  
  // 跳转报名详情
  goToRegistration(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/registration/registration?id=${id}` });
  },
  
  // 跳转签到
  goToCheckin(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/checkin/checkin?id=${id}` });
  }
});
