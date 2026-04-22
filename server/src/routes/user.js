// 用户路由
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Registration = require('../models/Registration');
const auth = require('../middleware/auth');

// 获取用户信息
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({ code: 0, data: user });
  } catch (error) {
    res.json({ code: 500, message: '获取失败' });
  }
});

// 更新用户信息
router.put('/profile', auth, async (req, res) => {
  try {
    const { nickname, avatar, phone } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { nickname, avatar, phone },
      { new: true }
    );
    
    res.json({ code: 0, data: user });
  } catch (error) {
    res.json({ code: 500, message: '更新失败' });
  }
});

// 获取用户统计数据
router.get('/stats', auth, async (req, res) => {
  try {
    const [totalReg, confirmedReg, checkedIn] = await Promise.all([
      Registration.countDocuments({ user: req.userId }),
      Registration.countDocuments({ user: req.userId, status: 'confirmed' }),
      Registration.countDocuments({ user: req.userId, status: 'checked-in' })
    ]);
    
    res.json({
      code: 0,
      data: {
        totalRegistrations: totalReg,
        confirmedCount: confirmedReg,
        checkedInCount: checkedIn
      }
    });
  } catch (error) {
    res.json({ code: 500, message: '获取失败' });
  }
});

module.exports = router;
