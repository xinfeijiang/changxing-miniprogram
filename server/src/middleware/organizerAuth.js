// 主办方认证中间件
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.json({ code: 401, message: '请先登录' });
    }
    
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'changxing-secret-key-2024';
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.json({ code: 404, message: '用户不存在' });
    }
    
    if (user.status === 'banned') {
      return res.json({ code: 403, message: '账号已被禁用' });
    }
    
    // 检查是否是主办方
    if (user.role !== 'organizer' && user.role !== 'admin') {
      return res.json({ code: 403, message: '需要主办方权限' });
    }
    
    req.userId = decoded.userId;
    req.user = user;
    
    next();
  } catch (error) {
    return res.json({ code: 401, message: '登录已过期' });
  }
};
