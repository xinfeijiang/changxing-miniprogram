# 畅行活动报名小程序

微信小程序活动报名系统 - 完整版

## 功能特性

- ✅ 活动浏览/搜索
- ✅ 活动详情展示
- ✅ 用户报名（多字段自定义）
- ✅ 付费报名（微信支付）
- ✅ 名额限制
- ✅ 签到/核销
- ✅ 用户管理（微信登录）
- ✅ 活动管理后台

## 技术栈

- **小程序**：微信小程序原生开发
- **后端**：Node.js + Express + MongoDB
- **设计**：Google Stitch 风格（深色主题）

## 项目结构

```
changxing-miniprogram/
├── miniprogram/          # 微信小程序前端
│   ├── pages/            # 页面
│   ├── components/       # 组件
│   ├── utils/            # 工具函数
│   ├── api/              # API 请求
│   ├── store/            # 状态管理
│   └── assets/           # 静态资源
│
└── server/               # 后端服务
    ├── src/
    │   ├── routes/      # 路由
    │   ├── models/       # 数据模型
    │   ├── middleware/  # 中间件
    │   ├── services/    # 业务逻辑
    │   └── utils/       # 工具
    └── config/          # 配置文件
```

## 开发

```bash
# 小程序开发
cd miniprogram
npm install
# 使用微信开发者工具打开

# 后端开发
cd server
npm install
npm run dev
```

## 许可证

MIT
