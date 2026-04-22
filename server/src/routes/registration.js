// 报名路由
const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { generateOrderId } = require('../utils/order');
const notification = require('../services/notification');

// 报名
router.post('/', auth, [
  body('activityId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({ code: 400, message: '参数错误' });
    }

    const { activityId, fields = {} } = req.body;

    // 获取活动
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.json({ code: 404, message: '活动不存在' });
    }

    // 检查活动状态
    if (activity.status !== 'published') {
      return res.json({ code: 400, message: '活动未发布' });
    }

    // 检查是否已满
    if (activity.spotsLeft <= 0) {
      return res.json({ code: 400, message: '活动名额已满' });
    }

    // 检查报名截止时间
    if (new Date() > new Date(activity.registrationDeadline)) {
      return res.json({ code: 400, message: '报名已截止' });
    }

    // 检查是否已报名
    const existReg = await Registration.findOne({
      activity: activityId,
      user: req.userId,
      status: { $ne: 'cancelled' }
    });

    if (existReg) {
      return res.json({ code: 400, message: '您已报名此活动' });
    }

    // 检查报名次数限制
    const userRegCount = await Registration.countDocuments({
      activity: activityId,
      user: req.userId
    });

    if (userRegCount >= activity.maxRegistrationsPerUser) {
      return res.json({ code: 400, message: '报名次数已达上限' });
    }

    // 验证必填字段
    const missingFields = [];
    for (const field of activity.registrationFields) {
      if (field.required && (!fields[field.name] || !fields[field.name].toString().trim())) {
        missingFields.push(field.label);
      }
    }

    if (missingFields.length > 0) {
      return res.json({
        code: 400,
        message: `请填写完整信息：${missingFields.join('、')}`
      });
    }

    // 创建报名
    const orderId = generateOrderId();

    const registration = await Registration.create({
      activity: activityId,
      user: req.userId,
      fields,
      orderId,
      paymentAmount: activity.price,
      requireApproval: activity.requireApproval,
      approvalStatus: activity.requireApproval ? 'pending' : 'approved',
      status: activity.requireApproval ? 'pending' : 'confirmed'
    });

    // 扣减名额
    if (!activity.requireApproval) {
      activity.spotsLeft = Math.max(0, activity.spotsLeft - 1);
      activity.registrationCount += 1;
      await activity.save();
    }

    // 获取用户信息用于通知
    const user = await User.findById(req.userId);
    const userPhone = fields.phone || user.phone;
    const userEmail = user.email;

    // 发送通知（异步，不阻塞响应）
    setImmediate(async () => {
      try {
        // 发送短信通知
        if (userPhone) {
          if (activity.requireApproval) {
            await notification.sendRegisterSuccessNotify(
              userPhone,
              activity.title,
              activity.startTime
            );
          } else {
            // 不需要审核，发送确认短信
            await notification.sendRegisterSuccessNotify(
              userPhone,
              activity.title,
              activity.startTime
            );
          }
        }
        
        // 发送邮件通知
        if (userEmail) {
          await notification.sendRegisterSuccessEmail(
            userEmail,
            activity.title,
            activity.startTime,
            activity.location
          );
        }
      } catch (error) {
        console.error('通知发送失败:', error);
      }
    });

    res.json({
      code: 0,
      message: activity.requireApproval ? '报名成功，请等待审核' : '报名成功',
      data: {
        id: registration._id,
        orderId: registration.orderId,
        paymentAmount: registration.paymentAmount,
        needPayment: registration.needPayment,
        status: registration.status
      }
    });
  } catch (error) {
    console.error('报名失败:', error);
    res.json({ code: 500, message: '报名失败' });
  }
});

// 获取我的报名列表
router.get('/my', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status } = req.query;

    const query = { user: req.userId };
    if (status) {
      query.status = status;
    }

    const [list, total] = await Promise.all([
      Registration.find(query)
        .populate({
          path: 'activity',
          select: 'title cover startTime endTime location price status'
        })
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

// 获取报名详情
router.get('/:id', auth, async (req, res) => {
  try {
    const registration = await Registration.findOne({
      _id: req.params.id,
      user: req.userId
    })
      .populate({
        path: 'activity',
        populate: {
          path: 'organizer',
          select: 'nickname avatar phone'
        }
      })
      .lean();

    if (!registration) {
      return res.json({ code: 404, message: '报名记录不存在' });
    }

    res.json({
      code: 0,
      data: registration
    });
  } catch (error) {
    console.error('获取报名详情失败:', error);
    res.json({ code: 500, message: '获取失败' });
  }
});

// 取消报名
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const registration = await Registration.findOne({
      _id: req.params.id,
      user: req.userId,
      status: { $ne: 'cancelled' }
    });

    if (!registration) {
      return res.json({ code: 404, message: '报名记录不存在' });
    }

    if (registration.status === 'checked-in') {
      return res.json({ code: 400, message: '已签到无法取消' });
    }

    // 如果是免费活动或已支付，需要处理名额
    if (registration.status === 'confirmed' && registration.paymentStatus === 'paid') {
      // TODO: 退款处理
      // 这里简化处理，直接释放名额
      await Activity.updateOne(
        { _id: registration.activity },
        {
          $inc: {
            spotsLeft: 1,
            registrationCount: -1
          }
        }
      );
    } else if (registration.status === 'confirmed') {
      // 未支付但已确认的报名
      await Activity.updateOne(
        { _id: registration.activity },
        {
          $inc: {
            spotsLeft: 1,
            registrationCount: -1
          }
        }
      );
    }

    registration.status = 'cancelled';
    if (registration.paymentStatus === 'paid') {
      registration.paymentStatus = 'refunded';
    }
    await registration.save();

    res.json({
      code: 0,
      message: '取消成功'
    });
  } catch (error) {
    console.error('取消报名失败:', error);
    res.json({ code: 500, message: '取消失败' });
  }
});

// 获取签到码
router.get('/:id/ticket', auth, async (req, res) => {
  try {
    const registration = await Registration.findOne({
      _id: req.params.id,
      user: req.userId
    })
      .populate({
        path: 'activity',
        select: 'title startTime endTime location'
      })
      .lean();

    if (!registration) {
      return res.json({ code: 404, message: '报名记录不存在' });
    }

    if (registration.status === 'cancelled') {
      return res.json({ code: 400, message: '报名已取消' });
    }

    res.json({
      code: 0,
      data: {
        ticketCode: registration.ticketCode,
        activity: registration.activity,
        status: registration.status,
        checkinTime: registration.checkinTime
      }
    });
  } catch (error) {
    console.error('获取签到码失败:', error);
    res.json({ code: 500, message: '获取失败' });
  }
});

module.exports = router;
