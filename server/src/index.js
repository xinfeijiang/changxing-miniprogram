// 畅行活动报名系统 - 后端入口
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// 导入路由
const authRoutes = require('./routes/auth');
const activityRoutes = require('./routes/activity');
const registrationRoutes = require('./routes/registration');
const userRoutes = require('./routes/user');
const checkinRoutes = require('./routes/checkin');
const paymentRoutes = require('./routes/payment');
const uploadRoutes = require('./routes/upload');
const wechatRoutes = require('./routes/wechat');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件
app.use('/uploads', express.static('uploads'));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/wechat', wechatRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 0, message: 'OK', data: { time: new Date() } });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    code: 500, 
    message: err.message || '服务器内部错误' 
  });
});

// 连接数据库并启动服务器
async function startServer() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/changxing';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 连接成功');
    
    app.listen(PORT, () => {
      console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
}

startServer();
