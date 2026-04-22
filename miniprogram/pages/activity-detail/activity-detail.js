// 活动详情页
Page({
  data: {
    id: null,
    activity: null,
    loading: true,
    userInfo: null,
    registration: null,
    
    // 报名表单
    showForm: false,
    formData: {},
    formFields: [],
    submitting: false
  },
  
  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadActivity();
    }
    
    const app = getApp();
    this.setData({ userInfo: app.globalData.userInfo });
  },
  
  onShow() {
    const app = getApp();
    this.setData({ userInfo: app.globalData.userInfo });
  },
  
  async loadActivity() {
    try {
      const app = getApp();
      const res = await app.request(`/activities/${this.data.id}`);
      
      if (res.data.code === 0) {
        this.setData({
          activity: res.data.data,
          registration: res.data.data.registration,
          formFields: res.data.data.registrationFields || [],
          loading: false
        });
        
        // 设置标题
        wx.setNavigationBarTitle({
          title: res.data.data.title
        });
      } else {
        app.showToast(res.data.message);
      }
    } catch (error) {
      console.error('加载失败:', error);
      app.showToast('加载失败');
    }
  },
  
  // 预览封面
  previewCover() {
    const { activity } = this.data;
    if (activity.cover) {
      wx.previewImage({
        urls: [activity.cover]
      });
    }
  },
  
  // 展开报名表单
  toggleForm() {
    const app = getApp();
    if (!app.globalData.isLoggedIn) {
      app.showToast('请先登录');
      return;
    }
    
    this.setData({ showForm: !this.data.showForm });
  },
  
  // 表单输入
  onFieldInput(e) {
    const { name } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`formData.${name}`]: value
    });
  },
  
  // 提交报名
  async submitRegistration() {
    const app = getApp();
    const { formData, formFields, activity } = this.data;
    
    // 验证必填
    for (const field of formFields) {
      if (field.required && (!formData[field.name] || !formData[field.name].toString().trim())) {
        app.showToast(`请填写 ${field.label}`);
        return;
      }
    }
    
    // 验证手机号
    const phoneField = formFields.find(f => f.type === 'phone');
    if (phoneField && phoneField.required) {
      const phone = formData[phoneField.name];
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        app.showToast('请填写正确的手机号');
        return;
      }
    }
    
    this.setData({ submitting: true });
    
    try {
      const res = await app.request({
        url: '/registrations',
        method: 'POST',
        data: {
          activityId: this.data.id,
          fields: formData
        }
      });
      
      if (res.data.code === 0) {
        app.showToast(res.data.message);
        
        // 如果需要支付，跳转支付
        if (res.data.data.needPayment) {
          wx.navigateTo({
            url: `/pages/payment/payment?id=${res.data.data.id}`
          });
        } else {
          // 刷新状态
          this.loadActivity();
        }
      } else {
        app.showToast(res.data.message);
      }
    } catch (error) {
      app.showToast('报名失败');
    } finally {
      this.setData({ submitting: false });
    }
  },
  
  // 取消报名
  async cancelRegistration() {
    const app = getApp();
    
    wx.showModal({
      title: '确认取消',
      content: '确定要取消此报名吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const res = await app.request({
              url: `/registrations/${this.data.registration.id}/cancel`,
              method: 'POST'
            });
            
            if (res.data.code === 0) {
              app.showToast('已取消');
              this.loadActivity();
            } else {
              app.showToast(res.data.message);
            }
          } catch (error) {
            app.showToast('取消失败');
          }
        }
      }
    });
  },
  
  // 查看报名详情
  goToRegistrationDetail() {
    wx.navigateTo({
      url: `/pages/registration/registration?id=${this.data.registration.id}`
    });
  },
  
  // 跳转我的报名
  goToMyRegistrations() {
    wx.switchTab({ url: '/pages/my-registrations/my-registrations' });
  },
  
  // 分享
  onShareAppMessage() {
    const { activity } = this.data;
    return {
      title: activity.title,
      path: `/pages/activity-detail/activity-detail?id=${activity.id}`,
      imageUrl: activity.cover
    };
  }
});
