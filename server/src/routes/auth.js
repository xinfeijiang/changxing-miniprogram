// 认证路由
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET || 'changxing-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

// 微信登录
router.post('/wx-login', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.json({ code: 400, message: '缺少 code 参数' });
    }
    
    // TODO: 使用微信 code2Session 获取 openid
    // 这里模拟一个 openid
    const openid = `mock_openid_${code}`;
    
    // 查找或创建用户
    let user = await User.findOne({ openid });
    
    if (!user) {
      user = await User.create({
        openid,
        nickname: '用户' + Date.now().toString().slice(-4)
      });
    } else {
      // 更新最后登录时间
      user.lastLoginAt = new Date();
      await user.save();
    }
    
    // 生成 token
    const token = jwt.sign(
      { userId: user._id, openid: user.openid },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      code: 0,
      message: '登录成功',
      data: {
        token,
        user: user.toJSON()
      }
    });
  } catch (error) {
    console.error('微信登录失败:', error);
    res.json({ code: 500, message: '登录失败' });
  }
});

// 手机号登录
router.post('/login', [
  body('phone').isMobilePhone('zh-CN'),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({ code: 400, message: '参数错误' });
    }
    
    const { phone, password } = req.body;
    
    const user = await User.findOne({ phone });
    if (!user) {
      return res.json({ code: 401, message: '用户不存在' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.json({ code: 401, message: '密码错误' });
    }
    
    if (user.status === 'banned') {
      return res.json({ code: 403, message: '账号已被禁用' });
    }
    
    user.lastLoginAt = new Date();
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id, openid: user.openid },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      code: 0,
      message: '登录成功',
      data: { token, user: user.toJSON() }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.json({ code: 500, message: '登录失败' });
  }
});

// 注册
router.post('/register', [
  body('phone').isMobilePhone('zh-CN'),
  body('password').isLength({ min: 6 }),
  body('nickname').isLength({ min: 2, max: 20 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({ code: 400, message: '参数错误' });
    }
    
    const { phone, password, nickname } = req.body;
    
    const existUser = await User.findOne({ phone });
    if (existUser) {
      return res.json({ code: 400, message: '手机号已注册' });
    }
    
    const user = await User.create({
      phone,
      password,
      nickname
    });
    
    const token = jwt.sign(
      { userId: user._id, openid: user.openid },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      code: 0,
      message: '注册成功',
      data: { token, user: user.toJSON() }
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.json({ code: 500, message: '注册失败' });
  }
});

// 获取当前用户信息
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.json({ code: 401, message: '未登录' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.json({ code: 404, message: '用户不存在' });
    }
    
    res.json({
      code: 0,
      data: user.toJSON()
    });
  } catch (error) {
    res.json({ code: 401, message: '登录已过期' });
  }
});

// 更新用户信息
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.json({ code: 401, message: '未登录' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const { nickname, avatar, phone } = req.body;
    
    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { nickname, avatar, phone },
      { new: true }
    );
    
    res.json({
      code: 0,
      message: '更新成功',
      data: user.toJSON()
    });
  } catch (error) {
    res.json({ code: 500, message: '更新失败' });
  }
});

module.exports = router;
