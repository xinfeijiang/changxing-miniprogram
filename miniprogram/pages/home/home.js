// 首页
Page({
  data: {
    // 搜索
    searchKeyword: '',
    
    // 活动数据
    hotActivities: [],
    upcomingActivities: [],
    allActivities: [],
    
    // 加载状态
    loading: true,
    loadingMore: false,
    hasMore: true,
    
    // 分页
    page: 1,
    pageSize: 10,
    
    // 标签
    tags: [
      { id: 0, name: '全部', active: true },
      { id: 1, name: '技术峰会', active: false },
      { id: 2, name: '商业论坛', active: false },
      { id: 3, name: '培训活动', active: false },
      { id: 4, name: '社交聚会', active: false }
    ],
    
    // 用户
    userInfo: null
  },
  
  onLoad() {
    // 获取用户信息
    const app = getApp();
    this.setData({ userInfo: app.globalData.userInfo });
    
    // 加载活动
    this.loadActivities();
  },
  
  onShow() {
    // 刷新用户信息
    const app = getApp();
    this.setData({ userInfo: app.globalData.userInfo });
  },
  
  // 搜索
  onSearch(e) {
    const keyword = e.detail.value || this.data.searchKeyword;
    this.setData({ searchKeyword: keyword, page: 1 });
    this.loadActivities(true);
  },
  
  // 搜索框输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },
  
  // 选择标签
  onTagSelect(e) {
    const { id } = e.currentTarget.dataset;
    const tags = this.data.tags.map(tag => ({
      ...tag,
      active: tag.id === id
    }));
    this.setData({ tags, page: 1 });
    this.loadActivities(true);
  },
  
  // 加载活动
  async loadActivities(reset = false) {
    if (reset) {
      this.setData({ page: 1, allActivities: [], loading: true });
    }
    
    const { page, pageSize, searchKeyword, tags } = this.data;
    const activeTag = tags.find(t => t.active);
    
    try {
      const app = getApp();
      const res = await app.request({
        url: '/activities',
        data: {
          page,
          pageSize,
          keyword: searchKeyword,
          category: activeTag && activeTag.id > 0 ? activeTag.name : ''
        }
      });
      
      if (res.data.code === 0) {
        const newActivities = res.data.data.list;
        
        this.setData({
          allActivities: reset ? newActivities : [...this.data.allActivities, ...newActivities],
          hotActivities: res.data.data.hot || [],
          upcomingActivities: res.data.data.upcoming || [],
          loading: false,
          loadingMore: false,
          hasMore: newActivities.length >= pageSize
        });
      }
    } catch (error) {
      console.error('加载活动失败:', error);
      this.setData({ loading: false });
      app.showToast('加载失败，请重试');
    }
  },
  
  // 加载更多
  onReachBottom() {
    if (!this.data.loadingMore && this.data.hasMore) {
      this.setData({ loadingMore: true, page: this.data.page + 1 });
      this.loadActivities();
    }
  },
  
  // 下拉刷新
  onPullDownRefresh() {
    this.loadActivities(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },
  
  // 跳转活动详情
  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/activity-detail/activity-detail?id=${id}` });
  },
  
  // 跳转创建活动
  goToCreate() {
    wx.navigateTo({ url: '/pages/create-activity/create-activity' });
  },
  
  // 跳转登录
  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  }
});
