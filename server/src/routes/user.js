// 用户路由
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Registration = require('../models/Registration');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');
const organizerAuth = require('../middleware/organizerAuth');

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
    const userId = req.userId;
    
    // 获取用户创建的活动
    const activities = await Activity.find({ organizer: userId }).select('_id');
    const activityIds = activities.map(a => a._id);
    
    const [
      totalActivities,
      publishedCount,
      totalRegistrations,
      pendingApproval
    ] = await Promise.all([
      Activity.countDocuments({ organizer: userId }),
      Activity.countDocuments({ organizer: userId, status: 'published' }),
      Registration.countDocuments({ 
        activity: { $in: activityIds },
        status: { $ne: 'cancelled' }
      }),
      Registration.countDocuments({
        activity: { $in: activityIds },
        approvalStatus: 'pending'
      })
    ]);
    
    res.json({
      code: 0,
      data: {
        totalActivities,
        publishedCount,
        totalRegistrations,
        pendingApproval
      }
    });
  } catch (error) {
    console.error('获取统计失败:', error);
    res.json({ code: 500, message: '获取失败' });
  }
});

// 获取我创建的活动列表
router.get('/my-activities', organizerAuth, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status } = req.query;
    
    const query = { organizer: req.userId };
    if (status) {
      query.status = status;
    }
    
    const [list, total] = await Promise.all([
      Activity.find(query)
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize))
        .lean(),
      Activity.countDocuments(query)
    ]);
    
    res.json({
      code: 0,
      data: {
        list,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取活动列表失败:', error);
    res.json({ code: 500, message: '获取失败' });
  }
});

module.exports = router;
