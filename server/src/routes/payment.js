// 支付路由
const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const auth = require('../middleware/auth');

// 发起支付
router.post('/create', auth, [
  body('registrationId').isMongoId()
], async (req, res) => {
  try {
    const registration = await Registration.findOne({
      _id: req.body.registrationId,
      user: req.userId,
      paymentStatus: 'unpaid'
    });
    
    if (!registration) {
      return res.json({ code: 404, message: '报名记录不存在或已支付' });
    }
    
    if (registration.paymentAmount <= 0) {
      return res.json({ code: 400, message: '免费活动无需支付' });
    }
    
    // TODO: 调用微信支付统一下单
    // 这里返回模拟的支付参数
    const payParams = {
      orderId: registration.orderId,
      amount: registration.paymentAmount,
      // 微信支付需要的参数
      appId: process.env.WX_APP_ID,
      timeStamp: Math.floor(Date.now() / 1000).toString(),
      nonceStr: Math.random().toString(36).slice(2),
      package: `prepay_id=mock_prepay_${registration._id}`,
      signType: 'MD5'
    };
    
    res.json({
      code: 0,
      data: payParams
    });
  } catch (error) {
    console.error('创建支付失败:', error);
    res.json({ code: 500, message: '支付失败' });
  }
});

// 支付回调
router.post('/notify', async (req, res) => {
  try {
    // TODO: 验证微信支付签名
    const { out_trade_no, transaction_id, trade_state } = req.body;
    
    if (trade_state === 'SUCCESS') {
      const registration = await Registration.findOne({ orderId: out_trade_no });
      
      if (registration && registration.paymentStatus === 'unpaid') {
        registration.paymentStatus = 'paid';
        registration.paymentTime = new Date();
        registration.transactionId = transaction_id;
        
        // 如果不需要审核，直接确认
        if (registration.approvalStatus === 'approved') {
          registration.status = 'confirmed';
          
          // 更新名额
          const Activity = require('../models/Activity');
          await Activity.updateOne(
            { _id: registration.activity },
            { 
              $inc: { 
                spotsLeft: -1,
                registrationCount: 1 
              }
            }
          );
        }
        
        await registration.save();
      }
    }
    
    res.json({ code: 0, message: 'OK' });
  } catch (error) {
    console.error('支付回调处理失败:', error);
    res.json({ code: 500, message: '处理失败' });
  }
});

// 查询支付状态
router.get('/status/:registrationId', auth, async (req, res) => {
  try {
    const registration = await Registration.findOne({
      _id: req.params.registrationId,
      user: req.userId
    });
    
    if (!registration) {
      return res.json({ code: 404, message: '报名记录不存在' });
    }
    
    res.json({
      code: 0,
      data: {
        paymentStatus: registration.paymentStatus,
        paymentTime: registration.paymentTime,
        transactionId: registration.transactionId
      }
    });
  } catch (error) {
    res.json({ code: 500, message: '查询失败' });
  }
});

module.exports = router;
