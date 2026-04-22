// 报名模型
const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  // 活动
  activity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: true
  },
  
  // 用户
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 报名信息
  fields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // 状态
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'checked-in', 'expired'],
    default: 'pending'
  },
  
  // 支付状态
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'refunded'],
    default: 'unpaid'
  },
  paymentAmount: {
    type: Number,
    default: 0
  },
  paymentTime: {
    type: Date
  },
  transactionId: {
    type: String
  },
  orderId: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // 审核
  requireApproval: {
    type: Boolean,
    default: false
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvalTime: {
    type: Date
  },
  approvalRemark: {
    type: String
  },
  
  // 签到
  checkinTime: {
    type: Date
  },
  checkinMethod: {
    type: String,
    enum: ['qrcode', 'manual', 'code'],
    default: 'qrcode'
  },
  checkinBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // 备注
  remarks: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

// 复合索引
registrationSchema.index({ activity: 1, user: 1 }, { unique: true });
registrationSchema.index({ activity: 1, status: 1 });
registrationSchema.index({ user: 1, status: 1 });
registrationSchema.index({ orderId: 1 });

// 虚拟字段：票券码
registrationSchema.virtual('ticketCode').get(function() {
  return `CX${this._id.toString().slice(-8).toUpperCase()}`;
});

// 虚拟字段：是否需要支付
registrationSchema.virtual('needPayment').get(function() {
  return this.paymentStatus === 'unpaid' && this.paymentAmount > 0;
});

// 方法：签到
registrationSchema.methods.checkin = async function(method = 'qrcode', operatorId = null) {
  if (this.status !== 'confirmed') {
    throw new Error('只有已确认的报名可以签到');
  }
  if (this.checkinTime) {
    throw new Error('已签到');
  }
  
  this.status = 'checked-in';
  this.checkinTime = new Date();
  this.checkinMethod = method;
  if (operatorId) {
    this.checkinBy = operatorId;
  }
  
  await this.save();
  
  // 更新活动的签到数
  const Activity = mongoose.model('Activity');
  await Activity.updateOne(
    { _id: this.activity },
    { $inc: { registrationCount: 1 } }
  );
};

// 方法：取消
registrationSchema.methods.cancel = async function() {
  if (this.status === 'cancelled') {
    throw new Error('已取消');
  }
  if (this.status === 'checked-in') {
    throw new Error('已签到无法取消');
  }
  
  this.status = 'cancelled';
  
  // 如果已支付，需要退款
  if (this.paymentStatus === 'paid') {
    this.paymentStatus = 'refunded';
  }
  
  await this.save();
  
  // 释放名额
  const Activity = mongoose.model('Activity');
  await Activity.updateOne(
    { _id: this.activity },
    { $inc: { spotsLeft: 1 } }
  );
};

module.exports = mongoose.model('Registration', registrationSchema);
