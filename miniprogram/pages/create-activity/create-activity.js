// 创建活动页面
Page({
  data: {
    // 表单数据
    formData: {
      title: '',
      cover: '',
      description: '',
      category: '其他',
      tags: '',
      startTime: '',
      endTime: '',
      registrationDeadline: '',
      location: '',
      address: '',
      totalSpots: 100,
      price: 0,
      requireApproval: false,
      checkinEnabled: true,
      registrationFields: []
    },
    
    // 表单字段定义
    customFields: [
      { name: 'name', label: '姓名', type: 'text', required: true },
      { name: 'phone', label: '手机号', type: 'phone', required: true },
      { name: 'company', label: '公司/单位', type: 'text', required: false },
      { name: 'position', label: '职位', type: 'text', required: false }
    ],
    
    // 选项
    categories: ['技术峰会', '商业论坛', '培训活动', '社交聚会', '其他'],
    
    // 状态
    submitting: false,
    showFieldEditor: false,
    editingField: null
  },
  
  // 输入监听
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: field === 'totalSpots' || field === 'price' ? parseInt(value) || 0 : value
    });
  },
  
  // 选择分类
  onCategoryChange(e) {
    this.setData({
      'formData.category': this.data.categories[e.detail.value]
    });
  },
  
  // 时间选择
  onTimeChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },
  
  // 开关
  onSwitchChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },
  
  // 添加自定义字段
  addField() {
    const { customFields, formData } = this.data;
    this.setData({
      'formData.registrationFields': [...formData.registrationFields, {
        name: `field_${Date.now()}`,
        label: '',
        type: 'text',
        required: false
      }]
    });
  },
  
  // 删除字段
  removeField(e) {
    const { index } = e.currentTarget.dataset;
    const fields = [...this.data.formData.registrationFields];
    fields.splice(index, 1);
    this.setData({ 'formData.registrationFields': fields });
  },
  
  // 字段编辑
  onFieldChange(e) {
    const { index, prop } = e.currentTarget.dataset;
    const fields = [...this.data.formData.registrationFields];
    fields[index][prop] = e.detail.value;
    this.setData({ 'formData.registrationFields': fields });
  },
  
  // 选择封面
  chooseCover() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 实际项目中应该上传到服务器
        this.setData({ 'formData.cover': res.tempFilePaths[0] });
      }
    });
  },
  
  // 验证
  validate() {
    const { formData } = this.data;
    const errors = [];
    
    if (!formData.title.trim()) errors.push('请输入活动标题');
    if (!formData.startTime) errors.push('请选择开始时间');
    if (!formData.endTime) errors.push('请选择结束时间');
    if (!formData.registrationDeadline) errors.push('请选择报名截止时间');
    if (!formData.location.trim()) errors.push('请输入活动地点');
    if (formData.totalSpots < 1) errors.push('请设置有效名额');
    if (formData.price < 0) errors.push('费用不能为负数');
    
    // 时间验证
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      errors.push('结束时间必须晚于开始时间');
    }
    if (formData.registrationDeadline && formData.startTime && formData.registrationDeadline >= formData.startTime) {
      errors.push('报名截止时间必须早于活动开始时间');
    }
    
    return errors;
  },
  
  // 提交
  async submit() {
    const errors = this.validate();
    if (errors.length > 0) {
      wx.showToast({ title: errors[0], icon: 'none' });
      return;
    }
    
    this.setData({ submitting: true });
    
    const app = getApp();
    const { formData } = this.data;
    
    // 处理标签
    const tags = formData.tags ? formData.tags.split(/[,，]/).filter(t => t.trim()) : [];
    
    // 合并默认字段和自定义字段
    const fields = [...this.data.customFields, ...formData.registrationFields];
    
    try {
      const res = await app.request({
        url: '/activities',
        method: 'POST',
        data: {
          ...formData,
          tags,
          registrationFields: fields
        }
      });
      
      if (res.data.code === 0) {
        app.showToast('创建成功');
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        app.showToast(res.data.message);
      }
    } catch (error) {
      app.showToast('创建失败');
    } finally {
      this.setData({ submitting: false });
    }
  }
});
