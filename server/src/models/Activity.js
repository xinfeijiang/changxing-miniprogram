// 活动模型
const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  label: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['text', 'number', 'phone', 'email', 'select', 'radio', 'checkbox', 'textarea', 'date'],
    default: 'text'
  },
  required: { type: Boolean, default: false },
  options: [{ type: String }],  // for select/radio/checkbox
  placeholder: { type: String },
  validation: { type: String }  // regex
}, { _id: false });

const activitySchema = new mongoose.Schema({
  // 基本信息
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  cover: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    trim: true,
    maxlength: 5000
  },
  category: {
    type: String,
    enum: ['技术峰会', '商业论坛', '培训活动', '社交聚会', '其他'],
    default: '其他'
  },
  tags: [{
    type: String
  }],
  
  // 时间信息
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  registrationDeadline: {
    type: Date,
    required: true
  },
  
  // 地点
  location: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  longitude: { type: Number },
  latitude: { type: Number },
  
  // 名额与费用
  totalSpots: {
    type: Number,
    required: true,
    min: 1
  },
  spotsLeft: {
    type: Number,
    default: function() { return this.totalSpots; }
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  maxRegistrationsPerUser: {
    type: Number,
    default: 1,
    min: 1
  },
  
  // 报名表单字段
  registrationFields: [fieldSchema],
  
  // 状态
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed', 'archived'],
    default: 'draft'
  },
  
  // 主办方
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 统计
  viewCount: {
    type: Number,
    default: 0
  },
  registrationCount: {
    type: Number,
    default: 0
  },
  
  // 审核
  requireApproval: {
    type: Boolean,
    default: false
  },
  
  // 签到
  checkinEnabled: {
    type: Boolean,
    default: true
  },
  checkinStartTime: {
    type: Date
  },
  
  // 扩展
  attachments: [{
    name: String,
    url: String
  }],
  remarks: {
    type: String,
    trim: true,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// 索引
activitySchema.index({ status: 1, startTime: 1 });
activitySchema.index({ category: 1 });
activitySchema.index({ organizer: 1 });
activitySchema.index({ title: 'text', description: 'text' });

// 虚拟字段：是否已满
activitySchema.virtual('isFull').get(function() {
  return this.spotsLeft <= 0;
});

// 虚拟字段：是否已开始
activitySchema.virtual('isStarted').get(function() {
  return new Date() > this.startTime;
});

// 虚拟字段：是否已结束
activitySchema.virtual('isEnded').get(function() {
  return new Date() > this.endTime;
});

// 虚拟字段：是否可以报名
activitySchema.virtual('canRegister').get(function() {
  const now = new Date();
  return this.status === 'published' && 
         this.spotsLeft > 0 && 
         now < this.registrationDeadline &&
         now < this.endTime;
});

// 自动更新 spotsLeft
activitySchema.pre('save', function(next) {
  if (this.isModified('totalSpots') && !this.isNew) {
    const diff = this.totalSpots - (this._original?.totalSpots || this.totalSpots);
    this.spotsLeft = Math.max(0, (this.spotsLeft || this.totalSpots) + diff);
  }
  next();
});

// 保存原始值用于对比
activitySchema.post('init', function(doc) {
  doc._original = doc.toObject();
});

module.exports = mongoose.model('Activity', activitySchema);
