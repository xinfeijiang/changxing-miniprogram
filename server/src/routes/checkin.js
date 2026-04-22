// 签到路由
const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const Activity = require('../models/Activity');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const organizerAuth = require('../middleware/organizerAuth');

// 扫码签到
router.post('/scan', organizerAuth, [
  body('code').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({ code: 400, message: '参数错误' });
    }
    
    const { code, activityId } = req.body;
    
    // 通过签到码查找报名
    const query = { 
      ticketCode: code,
      status: { $in: ['confirmed', 'pending'] }
    };
    
    if (activityId) {
      query.activity = activityId;
    }
    
    const registration = await Registration.findOne(query)
      .populate({
        path: 'activity',
        select: 'title startTime endTime checkinEnabled checkinStartTime'
      })
      .populate('user', 'nickname avatar phone');
    
    if (!registration) {
      return res.json({ code: 404, message: '未找到报名记录' });
    }
    
    if (registration.status === 'checked-in') {
      return res.json({ 
        code: 400, 
        message: '已签到',
        data: {
          checkinTime: registration.checkinTime,
          user: registration.user,
          activity: registration.activity
        }
      });
    }
    
    // 检查签到时间
    const now = new Date();
    if (registration.activity.checkinStartTime && now < new Date(registration.activity.checkinStartTime)) {
      return res.json({ code: 400, message: '签到时间未开始' });
    }
    
    if (now > new Date(registration.activity.endTime)) {
      return res.json({ code: 400, message: '活动已结束' });
    }
    
    // 签到
    await registration.checkin('qrcode', req.userId);
    
    res.json({
      code: 0,
      message: '签到成功',
      data: {
        user: registration.user,
        activity: registration.activity,
        checkinTime: registration.checkinTime
      }
    });
  } catch (error) {
    console.error('签到失败:', error);
    res.json({ code: 500, message: error.message || '签到失败' });
  }
});

// 手动签到
router.post('/manual', organizerAuth, [
  body('registrationId').isMongoId()
], async (req, res) => {
  try {
    const registration = await Registration.findOne({
      _id: req.body.registrationId,
      status: { $in: ['confirmed', 'pending'] }
    });
    
    if (!registration) {
      return res.json({ code: 404, message: '报名记录不存在' });
    }
    
    await registration.checkin('manual', req.userId);
    
    res.json({
      code: 0,
      message: '签到成功'
    });
  } catch (error) {
    res.json({ code: 500, message: error.message });
  }
});

// 核销码签到（用户出示二维码）
router.post('/verify', auth, [
  body('activityId').isMongoId()
], async (req, res) => {
  try {
    const registration = await Registration.findOne({
      activity: req.body.activityId,
      user: req.userId,
      status: { $in: ['confirmed', 'pending'] }
    });
    
    if (!registration) {
      return res.json({ code: 404, message: '未找到报名记录' });
    }
    
    if (registration.status === 'checked-in') {
      return res.json({ code: 400, message: '已签到' });
    }
    
    await registration.checkin('qrcode');
    
    res.json({
      code: 0,
      message: '签到成功'
    });
  } catch (error) {
    res.json({ code: 500, message: error.message });
  }
});

// 获取签到列表
router.get('/list/:activityId', organizerAuth, async (req, res) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.activityId,
      organizer: req.userId
    });
    
    if (!activity) {
      return res.json({ code: 404, message: '活动不存在' });
    }
    
    const { status, page = 1, pageSize = 20 } = req.query;
    
    const query = { activity: req.params.activityId };
    if (status === 'checked-in') {
      query.status = 'checked-in';
    } else if (status === 'not-checked') {
      query.status = { $in: ['confirmed', 'pending'] };
    }
    
    const [list, total, checkedCount] = await Promise.all([
      Registration.find(query)
        .populate('user', 'nickname avatar phone')
        .sort({ checkinTime: -1, createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize))
        .lean(),
      Registration.countDocuments(query),
      Registration.countDocuments({ 
        activity: req.params.activityId,
        status: 'checked-in'
      })
    ]);
    
    res.json({
      code: 0,
      data: {
        list,
        total,
        checkedCount,
        uncheckedCount: total - checkedCount,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取签到列表失败:', error);
    res.json({ code: 500, message: '获取失败' });
  }
});

module.exports = router;
