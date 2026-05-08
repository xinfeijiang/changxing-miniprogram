// 微信相关 API 路由
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 微信 access_token 缓存
let accessTokenCache = {
  token: null,
  expiresAt: 0
};

// 获取微信 access_token
async function getAccessToken() {
  const now = Date.now();
  
  // 检查缓存的 token 是否有效
  if (accessTokenCache.token && accessTokenCache.expiresAt > now) {
    return accessTokenCache.token;
  }
  
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;
  
  if (!appId || !appSecret) {
    throw new Error('微信 AppID 或 AppSecret 未配置');
  }
  
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
  
  try {
    const response = await axios.get(url);
    const data = response.data;
    
    if (data.errcode) {
      throw new Error(`微信 API 错误: ${data.errmsg}`);
    }
    
    // 缓存 token（提前 5 分钟过期）
    accessTokenCache = {
      token: data.access_token,
      expiresAt: now + (data.expires_in - 300) * 1000
    };
    
    return data.access_token;
  } catch (error) {
    console.error('获取 access_token 失败:', error.message);
    throw error;
  }
}

// 生成小程序码 (A 接口)
router.post('/wxa-code', async (req, res) => {
  try {
    const { path, width = 430, autoColor = true, lineColor } = req.body;
    
    if (!path) {
      return res.status(400).json({ 
        code: 400, 
        message: '缺少 path 参数' 
      });
    }
    
    const accessToken = await getAccessToken();
    const url = `https://api.weixin.qq.com/wxa/getwxacode?access_token=${accessToken}`;
    
    const requestData = {
      path,
      width,
      autoColor,
      lineColor: lineColor || { r: 0, g: 0, b: 0 },
      isHyaline: false
    };
    
    const response = await axios.post(url, requestData, {
      responseType: 'arraybuffer'
    });
    
    // 检查是否返回错误
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('application/json')) {
      const errorData = JSON.parse(response.data.toString());
      return res.status(400).json({
        code: errorData.errcode || 400,
        message: errorData.errmsg || '生成小程序码失败'
      });
    }
    
    // 将二进制数据转为 base64
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const dataUri = `data:image/png;base64,${base64}`;
    
    res.json({
      code: 0,
      message: 'success',
      data: dataUri
    });
    
  } catch (error) {
    console.error('生成小程序码失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '生成小程序码失败'
    });
  }
});

// 生成小程序码 - 不受限版本 (B 接口，带 scene 参数)
router.post('/wxa-code-unlimit', async (req, res) => {
  try {
    const { scene, page, width = 430, autoColor = true } = req.body;
    
    if (!scene) {
      return res.status(400).json({ 
        code: 400, 
        message: '缺少 scene 参数' 
      });
    }
    
    const accessToken = await getAccessToken();
    const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`;
    
    const requestData = {
      scene,
      page,
      width,
      autoColor,
      isHyaline: false
    };
    
    const response = await axios.post(url, requestData, {
      responseType: 'arraybuffer'
    });
    
    // 检查是否返回错误
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('application/json')) {
      const errorData = JSON.parse(response.data.toString());
      return res.status(400).json({
        code: errorData.errcode || 400,
        message: errorData.errmsg || '生成小程序码失败'
      });
    }
    
    // 将二进制数据转为 base64
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const dataUri = `data:image/png;base64,${base64}`;
    
    res.json({
      code: 0,
      message: 'success',
      data: dataUri
    });
    
  } catch (error) {
    console.error('生成小程序码(不受限)失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '生成小程序码失败'
    });
  }
});

// 获取小程序太阳码 (带 URL Scheme)
router.post('/url-scheme', async (req, res) => {
  try {
    const { path, query } = req.body;
    
    if (!path) {
      return res.status(400).json({ 
        code: 400, 
        message: '缺少 path 参数' 
      });
    }
    
    const accessToken = await getAccessToken();
    const url = `https://api.weixin.qq.com/wxa/generatescheme?access_token=${accessToken}`;
    
    const requestData = {
      jumpWxa: {
        path,
        query: query || '',
        envVersion: 'release'
      },
      expireType: 1,
      expireTime: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // 30 天
    };
    
    const response = await axios.post(url, requestData);
    const data = response.data;
    
    if (data.errcode) {
      return res.status(400).json({
        code: data.errcode,
        message: data.errmsg || '生成 URL Scheme 失败'
      });
    }
    
    res.json({
      code: 0,
      message: 'success',
      data: data.openlink
    });
    
  } catch (error) {
    console.error('生成 URL Scheme 失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '生成 URL Scheme 失败'
    });
  }
});

// 微信分享配置 (JS-SDK 签名)
router.get('/js-config', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ 
        code: 400, 
        message: '缺少 url 参数' 
      });
    }
    
    const accessToken = await getAccessToken();
    
    // 获取 jsapi_ticket
    const ticketUrl = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${accessToken}&type=jsapi`;
    const ticketResponse = await axios.get(ticketUrl);
    const ticketData = ticketResponse.data;
    
    if (!ticketData.ticket) {
      throw new Error('获取 jsapi_ticket 失败');
    }
    
    const timestamp = Math.floor(Date.now() / 1000);
    const noncestr = Math.random().toString(36).substring(2, 15);
    const jsapiTicket = ticketData.ticket;
    
    // 签名
    const signature = require('crypto')
      .createHash('sha1')
      .update(`jsapi_ticket=${jsapiTicket}&noncestr=${noncestr}&timestamp=${timestamp}&url=${url}`)
      .digest('hex');
    
    res.json({
      code: 0,
      message: 'success',
      data: {
        appId: process.env.WECHAT_APP_ID,
        timestamp,
        nonceStr: noncestr,
        signature
      }
    });
    
  } catch (error) {
    console.error('获取 JS 配置失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取 JS 配置失败'
    });
  }
});

// 小程序码下载 (小程序内使用)
router.get('/qrcode/:path(*)', async (req, res) => {
  try {
    const pathStr = decodeURIComponent(req.params.path);
    
    const accessToken = await getAccessToken();
    const url = `https://api.weixin.qq.com/wxa/getwxacode?access_token=${accessToken}`;
    
    const requestData = {
      path: pathStr,
      width: 280,
      autoColor: true,
      isHyaline: false
    };
    
    const response = await axios.post(url, requestData, {
      responseType: 'arraybuffer'
    });
    
    res.set('Content-Type', 'image/png');
    res.send(response.data);
    
  } catch (error) {
    console.error('获取小程序码失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取小程序码失败'
    });
  }
});

module.exports = router;
