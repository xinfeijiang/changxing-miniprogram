// 文件上传路由
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const organizerAuth = require('../middleware/organizerAuth');
const oss = require('../services/oss');

// 配置multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件'));
    }
  }
});

// 上传活动封面
router.post('/cover', organizerAuth, upload.single('cover'), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ code: 400, message: '请选择图片' });
    }
    
    const result = await oss.uploadActivityCover(req.file.path);
    
    // 删除临时文件
    fs.unlinkSync(req.file.path);
    
    res.json({
      code: 0,
      message: '上传成功',
      data: {
        url: result.url,
        name: result.name
      }
    });
  } catch (error) {
    console.error('上传失败:', error);
    res.json({ code: 500, message: '上传失败' });
  }
});

// 上传头像
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ code: 400, message: '请选择图片' });
    }
    
    const result = await oss.uploadAvatar(req.file.path);
    
    // 删除临时文件
    fs.unlinkSync(req.file.path);
    
    res.json({
      code: 0,
      message: '上传成功',
      data: {
        url: result.url,
        name: result.name
      }
    });
  } catch (error) {
    console.error('上传失败:', error);
    res.json({ code: 500, message: '上传失败' });
  }
});

// Base64图片上传
router.post('/base64', auth, async (req, res) => {
  try {
    const { image, type = 'cover' } = req.body;
    
    if (!image) {
      return res.json({ code: 400, message: '请提供图片数据' });
    }
    
    const options = {
      prefix: type === 'avatar' ? 'avatars' : 'activities/covers'
    };
    
    const result = await oss.uploadBase64(image, options);
    
    res.json({
      code: 0,
      message: '上传成功',
      data: {
        url: result.url,
        name: result.name
      }
    });
  } catch (error) {
    console.error('上传失败:', error);
    res.json({ code: 500, message: '上传失败' });
  }
});

module.exports = router;
