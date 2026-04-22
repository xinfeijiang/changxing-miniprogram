// 短信通知服务
const https = require('https');
const crypto = require('crypto');

// 阿里云短信配置
const config = {
  accessKeyId: process.env.ALI_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALI_ACCESS_KEY_SECRET,
  signName: process.env.SMS_SIGN_NAME || '畅行活动',
  templateCode: process.env.SMS_TEMPLATE_CODE
};

// 短信模板
const TEMPLATES = {
  // 报名成功通知
  REGISTER_SUCCESS: 'SMS_xxxxx',
  // 审核通过通知
  APPROVE_SUCCESS: 'SMS_xxxxx',
  // 审核拒绝通知
  APPROVE_REJECT: 'SMS_xxxxx',
  // 活动开始提醒
  ACTIVITY_START: 'SMS_xxxxx',
  // 签到成功通知
  CHECKIN_SUCCESS: 'SMS_xxxxx'
};

// 发送短信
async function sendSMS(phone, templateCode, params) {
  if (!config.accessKeyId || !config.templateCode) {
    console.warn('短信服务未配置，跳过发送');
    return { success: true, mock: true };
  }
  
  // 阿里云短信API调用
  // 这里简化处理，实际需要调用阿里云短信API
  try {
    // 实际项目中需要：
    // 1. 签名算法 https://help.aliyun.com/document_detail/107994.html
    // 2. 调用 SendSms API
    
    console.log(`[SMS] 发送短信到 ${phone}: ${templateCode}`, params);
    
    return {
      success: true,
      messageId: `mock_${Date.now()}`
    };
  } catch (error) {
    console.error('短信发送失败:', error);
    return { success: false, error: error.message };
  }
}

// 发送报名成功通知
async function sendRegisterSuccessNotify(phone, activityTitle, startTime) {
  return sendSMS(phone, TEMPLATES.REGISTER_SUCCESS, {
    activityTitle,
    startTime
  });
}

// 发送审核通过通知
async function sendApproveSuccessNotify(phone, activityTitle) {
  return sendSMS(phone, TEMPLATES.APPROVE_SUCCESS, {
    activityTitle
  });
}

// 发送审核拒绝通知
async function sendApproveRejectNotify(phone, activityTitle, reason) {
  return sendSMS(phone, TEMPLATES.APPROVE_REJECT, {
    activityTitle,
    reason
  });
}

// 发送活动开始提醒
async function sendActivityStartNotify(phone, activityTitle, location) {
  return sendSMS(phone, TEMPLATES.ACTIVITY_START, {
    activityTitle,
    location
  });
}

// 发送签到成功通知
async function sendCheckinSuccessNotify(phone, activityTitle) {
  return sendSMS(phone, TEMPLATES.CHECKIN_SUCCESS, {
    activityTitle
  });
}

// 邮件通知服务（备用）
const nodemailer = require('nodemailer');

const emailConfig = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

// 创建邮件传输器
let emailTransporter = null;

function getEmailTransporter() {
  if (emailTransporter) return emailTransporter;
  
  if (!emailConfig.host) {
    console.warn('邮件服务未配置');
    return null;
  }
  
  emailTransporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: {
      user: emailConfig.auth.user,
      pass: emailConfig.auth.pass
    }
  });
  
  return emailTransporter;
}

// 发送邮件
async function sendEmail(to, subject, html) {
  const transporter = getEmailTransporter();
  
  if (!transporter) {
    console.warn('邮件未配置，跳过发送');
    return { success: true, mock: true };
  }
  
  try {
    const info = await transporter.sendMail({
      from: `"畅行活动" <${emailConfig.auth.user}>`,
      to,
      subject,
      html
    });
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('邮件发送失败:', error);
    return { success: false, error: error.message };
  }
}

// 发送报名成功邮件
async function sendRegisterSuccessEmail(email, activityTitle, startTime, location) {
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="background: linear-gradient(135deg, #8AB4F8 0%, #C58AF9 100%); padding: 40px; text-align: center;">
        <h1 style="color: #191A1F; margin: 0;">报名成功</h1>
      </div>
      <div style="padding: 40px; background: #24262E; color: #E8EAED;">
        <p style="font-size: 16px;">您好，</p>
        <p style="font-size: 16px;">您已成功报名参加 <strong>${activityTitle}</strong></p>
        <div style="background: #191A1F; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>📅活动时间：</strong>${startTime}</p>
          <p style="margin: 10px 0;"><strong>📍活动地点：</strong>${location}</p>
        </div>
        <p style="font-size: 14px; color: #9AA0A6;">请准时参加，携带签到码入场</p>
      </div>
      <div style="text-align: center; padding: 20px; color: #5F6368; font-size: 12px;">
        <p>© 畅行活动报名系统</p>
      </div>
    </div>
  `;
  
  return sendEmail(email, `报名成功 - ${activityTitle}`, html);
}

module.exports = {
  sendSMS,
  sendRegisterSuccessNotify,
  sendApproveSuccessNotify,
  sendApproveRejectNotify,
  sendActivityStartNotify,
  sendCheckinSuccessNotify,
  sendEmail,
  sendRegisterSuccessEmail
};
