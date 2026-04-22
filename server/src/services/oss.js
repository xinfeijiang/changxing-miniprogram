// 阿里云OSS上传服务
const fs = require('fs');
const path = require('path');

// 阿里云OSS配置
const config = {
  region: process.env.OSS_REGION || 'oss-cn-shanghai',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
  endpoint: process.env.OSS_ENDPOINT
};

// 初始化OSS客户端
let ossClient = null;

async function getOssClient() {
  if (ossClient) return ossClient;
  
  if (!config.accessKeyId || !config.bucket) {
    console.warn('OSS未配置，将使用本地存储');
    return null;
  }
  
  const AliOSS = require('ali-oss');
  ossClient = new AliOSS({
    region: config.region,
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    bucket: config.bucket
  });
  
  return ossClient;
}

// 生成随机文件名
function generateFileName(ext) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 10);
  return `uploads/${year}/${month}/${day}/${random}.${ext}`;
}

// 上传文件
async function uploadFile(filePath, options = {}) {
  const client = await getOssClient();
  
  if (!client) {
    // 本地存储模式
    return uploadLocal(filePath, options);
  }
  
  const ext = path.extname(filePath).slice(1) || 'jpg';
  const fileName = options.prefix 
    ? `${options.prefix}/${generateFileName(ext)}`
    : generateFileName(ext);
  
  try {
    const result = await client.put(fileName, filePath);
    return {
      success: true,
      url: result.url,
      name: fileName
    };
  } catch (error) {
    console.error('OSS上传失败:', error);
    // 降级到本地存储
    return uploadLocal(filePath, options);
  }
}

// 上传Base64图片
async function uploadBase64(base64Data, options = {}) {
  const client = await getOssClient();
  
  // 解析base64
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('无效的Base64图片数据');
  }
  
  const ext = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  
  if (!client) {
    // 本地存储
    return uploadBase64Local(buffer, ext, options);
  }
  
  const fileName = options.prefix 
    ? `${options.prefix}/${generateFileName(ext)}`
    : generateFileName(ext);
  
  try {
    const result = await client.put(fileName, buffer);
    return {
      success: true,
      url: result.url,
      name: fileName
    };
  } catch (error) {
    console.error('OSS上传失败:', error);
    return uploadBase64Local(buffer, ext, options);
  }
}

// 本地存储上传
async function uploadLocal(filePath, options) {
  const uploadsDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const ext = path.extname(filePath).slice(1) || 'jpg';
  const fileName = generateFileName(ext);
  const fullPath = path.join(uploadsDir, fileName);
  
  // 确保目录存在
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.copyFileSync(filePath, fullPath);
  
  return {
    success: true,
    url: `/uploads/${fileName}`,
    name: fileName
  };
}

// Base64本地存储
async function uploadBase64Local(buffer, ext, options) {
  const uploadsDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const fileName = generateFileName(ext);
  const fullPath = path.join(uploadsDir, fileName);
  
  // 确保目录存在
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, buffer);
  
  return {
    success: true,
    url: `/uploads/${fileName}`,
    name: fileName
  };
}

// 上传活动封面
async function uploadActivityCover(filePath) {
  return uploadFile(filePath, { prefix: 'activities/covers' });
}

// 上传用户头像
async function uploadAvatar(filePath) {
  return uploadFile(filePath, { prefix: 'avatars' });
}

// 上传报名附件
async function uploadAttachment(filePath) {
  return uploadFile(filePath, { prefix: 'attachments' });
}

module.exports = {
  uploadFile,
  uploadBase64,
  uploadActivityCover,
  uploadAvatar,
  uploadAttachment,
  getOssClient
};
