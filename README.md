# 畅行活动报名管理系统

微信小程序活动报名系统 - 完整版 (v1.3)

![Version](https://img.shields.io/badge/version-1.3.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 📱 功能特性

### 用户端
- ✅ 活动浏览/搜索/筛选
- ✅ 活动详情展示
- ✅ 用户报名（自定义多字段表单）
- ✅ 微信支付（付费活动）
- ✅ 电子签到码
- ✅ 我的报名管理
- ✅ 微信一键登录

### 管理端
- ✅ 活动创建/编辑/发布
- ✅ 报名名单管理
- ✅ 报名审核（需审核的活动）
- ✅ 扫码签到
- ✅ 手动签到
- ✅ 数据统计

### 高级功能
- ✅ 名额限制
- ✅ 报名截止时间
- ✅ 活动分类/标签
- ✅ 审核机制开关

## 🛠 技术栈

### 前端
- **微信小程序**：原生开发
- **设计风格**：Google Stitch (深色主题)

### 后端
- **运行时**：Node.js
- **框架**：Express
- **数据库**：MongoDB
- **认证**：JWT + 微信登录

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone <repository-url> changxing-miniprogram
cd changxing-miniprogram
```

### 2. 安装后端依赖
```bash
cd server
npm install
```

### 3. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 填入真实配置
```

### 4. 启动 MongoDB
```bash
# 本地或使用云数据库
mongod --dbpath /data/db
```

### 5. 启动后端服务
```bash
# 开发模式
npm run dev

# 生产模式
npm start
# 或使用 PM2
pm2 start pm2.config.js
```

### 6. 微信开发者工具
```bash
# 用微信开发者工具打开 miniprogram/ 目录
# 配置 AppID 和请求域名
```

## 📁 项目结构

```
changxing-miniprogram/
├── miniprogram/          # 微信小程序
│   ├── app.js/json/wxss  # 全局配置
│   ├── pages/            # 页面
│   │   ├── home/         # 首页
│   │   ├── activity-detail/
│   │   ├── create-activity/
│   │   ├── registration/
│   │   ├── my-registrations/
│   │   ├── dashboard/
│   │   └── checkin/
│   └── components/
│
├── server/               # 后端服务
│   ├── src/
│   │   ├── models/       # 数据模型
│   │   │   ├── User.js
│   │   │   ├── Activity.js
│   │   │   └── Registration.js
│   │   ├── routes/       # API 路由
│   │   │   ├── auth.js
│   │   │   ├── activity.js
│   │   │   ├── registration.js
│   │   │   ├── checkin.js
│   │   │   └── payment.js
│   │   ├── middleware/   # 中间件
│   │   └── utils/
│   ├── .env              # 环境变量
│   └── package.json
│
├── README.md
└── STRUCTURE.md
```

## 🔧 API 接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/auth/wx-login | 微信登录 |
| GET | /api/activities | 获取活动列表 |
| GET | /api/activities/:id | 获取活动详情 |
| POST | /api/activities | 创建活动 |
| PUT | /api/activities/:id | 更新活动 |
| POST | /api/activities/:id/publish | 发布活动 |
| POST | /api/registrations | 报名 |
| GET | /api/registrations/my | 我的报名 |
| POST | /api/registrations/:id/cancel | 取消报名 |
| GET | /api/registrations/:id/ticket | 获取签到码 |
| POST | /api/checkin/scan | 扫码签到 |
| POST | /api/payment/create | 发起支付 |

## 🖥 部署

### 后端部署（PM2）
```bash
cd server
npm install -g pm2
pm2 start pm2.config.js
pm2 save
pm2 startup
```

### 小程序部署
1. 在微信开发者工具中点击「上传」
2. 登录小程序后台
3. 提交审核
4. 审核通过后发布

## 🔐 配置说明

### 微信小程序配置
- 在微信公众平台注册小程序
- 获取 AppID 和 AppSecret
- 配置服务器域名（request合法域名）
- 开通微信支付（需要商户号）

### 生产环境建议
- 使用云数据库（阿里云MongoDB/腾讯云MongoDB）
- 配置HTTPS
- 使用PM2/Supervisor管理进程
- 配置防火墙规则

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 了解详情

---

**作者**: 小飞 🦾  
**版本**: 1.3.0  
**更新**: 2026-04-23
