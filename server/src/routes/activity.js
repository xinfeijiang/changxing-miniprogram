// 活动路由
const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const Registration = require('../models/Registration');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const organizerAuth = require('../middleware/organizerAuth');

// 获取活动列表
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      keyword, 
      category, 
      status = 'published',
      sort = 'startTime',
      order = 'asc'
    } = req.query;
    
    const query = {};
    
    // 状态筛选
    if (status) {
      query.status = status;
    }
    
    // 关键词搜索
    if (keyword) {
      query.$text = { $search: keyword };
    }
    
    // 分类筛选
    if (category) {
      query.category = category;
    }
    
    // 排序
    const sortOption = {};
    sortOption[sort] = order === 'asc' ? 1 : -1;
    
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    
    const [list, total, hot, upcoming] = await Promise.all([
      Activity.find(query)
        .populate('organizer', 'nickname avatar')
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(pageSize))
        .lean(),
      Activity.countDocuments(query),
      // 热门活动（按报名数排序）
      Activity.find({ status: 'published' })
        .sort({ registrationCount: -1 })
        .limit(5)
        .lean(),
      // 即将开始的活动
      Activity.find({ 
        status: 'published',
        startTime: { $gt: new Date() }
      })
        .sort({ startTime: 1 })
        .limit(5)
        .lean()
    ]);
    
    res.json({
      code: 0,
      data: {
        list,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        hot,
        upcoming
      }
    });
  } catch (error) {
    console.error('获取活动列表失败:', error);
    res.json({ code: 500, message: '获取失败' });
  }
});

// 获取活动详情
router.get('/:id', async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('organizer', 'nickname avatar')
      .lean();
    
    if (!activity) {
      return res.json({ code: 404, message: '活动不存在' });
    }
    
    // 增加浏览数
    Activity.updateOne({ _id: req.params.id }, { $inc: { viewCount: 1 } });
    
    // 获取用户报名状态
    let registration = null;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'changxing-secret-key-2024');
        registration = await Registration.findOne({
          activity: req.params.id,
          user: decoded.userId,
          status: { $ne: 'cancelled' }
        });
      } catch (e) {}
    }
    
    res.json({
      code: 0,
      data: {
        ...activity,
        registration: registration ? {
          id: registration._id,
          status: registration.status,
          paymentStatus: registration.paymentStatus
        } : null
      }
    });
  } catch (error) {
    console.error('获取活动详情失败:', error);
    res.json({ code: 500, message: '获取失败' });
  }
});

// 创建活动
router.post('/', organizerAuth, [
  body('title').isLength({ min: 2, max: 100 }),
  body('startTime').isISO8601(),
  body('endTime').isISO8601(),
  body('registrationDeadline').isISO8601(),
  body('location').notEmpty(),
  body('totalSpots').isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({ code: 400, message: '参数错误' });
    }
    
    const activityData = {
      ...req.body,
      organizer: req.userId,
      spotsLeft: req.body.totalSpots
    };
    
    const activity = await Activity.create(activityData);
    
    res.json({
      code: 0,
      message: '创建成功',
      data: activity
    });
  } catch (error) {
    console.error('创建活动失败:', error);
    res.json({ code: 500, message: '创建失败' });
  }
});

// 更新活动
router.put('/:id', organizerAuth, async (req, res) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.id,
      organizer: req.userId
    });
    
    if (!activity) {
      return res.json({ code: 404, message: '活动不存在或无权限' });
    }
    
    // 不能修改已结束的活动
    if (activity.status === 'completed' || activity.status === 'archived') {
      return res.json({ code: 400, message: '已结束的活动不能修改' });
    }
    
    const updateData = { ...req.body };
    delete updateData.organizer;
    delete updateData.registrationCount;
    
    Object.assign(activity, updateData);
    await activity.save();
    
    res.json({
      code: 0,
      message: '更新成功',
      data: activity
    });
  } catch (error) {
    console.error('更新活动失败:', error);
    res.json({ code: 500, message: '更新失败' });
  }
});

// 删除活动
router.delete('/:id', organizerAuth, async (req, res) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.id,
      organizer: req.userId
    });
    
    if (!activity) {
      return res.json({ code: 404, message: '活动不存在或无权限' });
    }
    
    // 检查是否有人报名
    const registrationCount = await Registration.countDocuments({
      activity: req.params.id,
      status: { $ne: 'cancelled' }
    });
    
    if (registrationCount > 0) {
      return res.json({ code: 400, message: '已有报名，无法删除' });
    }
    
    await Activity.deleteOne({ _id: req.params.id });
    
    res.json({ code: 0, message: '删除成功' });
  } catch (error) {
    console.error('删除活动失败:', error);
    res.json({ code: 500, message: '删除失败' });
  }
});

// 发布活动
router.post('/:id/publish', organizerAuth, async (req, res) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.id,
      organizer: req.userId
    });
    
    if (!activity) {
      return res.json({ code: 404, message: '活动不存在' });
    }
    
    if (activity.status !== 'draft') {
      return res.json({ code: 400, message: '只有草稿状态可以发布' });
    }
    
    // 验证活动时间
    if (new Date() > new Date(activity.startTime)) {
      return res.json({ code: 400, message: '活动已开始，不能发布' });
    }
    
    activity.status = 'published';
    await activity.save();
    
    res.json({
      code: 0,
      message: '发布成功',
      data: activity
    });
  } catch (error) {
    console.error('发布活动失败:', error);
    res.json({ code: 500, message: '发布失败' });
  }
});

// 获取活动报名列表
router.get('/:id/registrations', organizerAuth, async (req, res) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.id,
      organizer: req.userId
    });
    
    if (!activity) {
      return res.json({ code: 404, message: '活动不存在' });
    }
    
    const { status, page = 1, pageSize = 20 } = req.query;
    
    const query = { activity: req.params.id };
    if (status) {
      query.status = status;
    }
    
    const [list, total] = await Promise.all([
      Registration.find(query)
        .populate('user', 'nickname avatar phone')
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize))
        .lean(),
      Registration.countDocuments(query)
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
    console.error('获取报名列表失败:', error);
    res.json({ code: 500, message: '获取失败' });
  }
});

// 审核报名
router.post('/:id/registrations/:regId/approve', organizerAuth, async (req, res) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.id,
      organizer: req.userId
    });
    
    if (!activity) {
      return res.json({ code: 404, message: '活动不存在' });
    }
    
    const registration = await Registration.findOne({
      _id: req.params.regId,
      activity: req.params.id
    });
    
    if (!registration) {
      return res.json({ code: 404, message: '报名记录不存在' });
    }
    
    registration.approvalStatus = 'approved';
    registration.approvalTime = new Date();
    registration.status = 'confirmed';
    await registration.save();
    
    res.json({
      code: 0,
      message: '审核通过',
      data: registration
    });
  } catch (error) {
    console.error('审核失败:', error);
    res.json({ code: 500, message: '操作失败' });
  }
});

module.exports = router;
