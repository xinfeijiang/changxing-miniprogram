# 微信朋友圈分享海报功能

## 功能说明

在活动详情页添加"朋友圈"按钮，点击后可以生成带有小程序码的分享海报图片，用户可以保存到相册后分享到微信朋友圈。

## 文件结构

```
miniprogram/
├── pages/
│   └── share-poster/          # 新增：分享海报页面
│       ├── share-poster.js
│       ├── share-poster.wxml
│       └── share-poster.wxss
│   └── activity-detail/       # 修改：活动详情页
│       ├── activity-detail.js
│       ├── activity-detail.wxml
│       └── activity-detail.wxss
└── app.json                   # 修改：注册新页面

server/
├── src/
│   ├── index.js               # 修改：注册微信路由
│   └── routes/
│       └── wechat.js          # 新增：微信 API 路由
└── .env.example               # 新增：环境变量示例
```

## 使用方法

### 1. 配置微信小程序

在 `server/.env` 中配置：

```
WECHAT_APP_ID=你的小程序AppID
WECHAT_APP_SECRET=你的小程序AppSecret
```

### 2. 功能入口

在活动详情页面底部有两个分享按钮：
- **分享**：发送给朋友/群聊（微信原生分享）
- **朋友圈**：生成海报图片，保存后可以分享到朋友圈

### 3. 海报内容

生成的海报包含：
- 活动封面图片
- 活动标题
- 活动时间
- 活动地点
- 报名人数/费用
- 小程序码（扫码直接进入活动详情）

## API 端点

| 端点 | 方法 | 说明 |
|-----|------|------|
| `/api/wechat/wxa-code` | POST | 生成小程序码（A接口） |
| `/api/wechat/wxa-code-unlimit` | POST | 生成小程序码（B接口，不受限） |
| `/api/wechat/url-scheme` | POST | 生成 URL Scheme |
| `/api/wechat/js-config` | GET | 获取 JS-SDK 签名配置 |

## 注意事项

1. **小程序码数量限制**：A 接口每月有限额（1000个），建议使用 B 接口（不受限）
2. **域名配置**：需要在微信小程序后台配置 request 域名
3. **头像昵称**：如果活动主办方有头像，会显示在海报中

## 常见问题

### Q: 海报生成失败怎么办？
A: 检查后端控制台日志，确认微信 AppID 和 AppSecret 是否正确配置。

### Q: 保存到相册失败？
A: 需要在微信小程序后台配置"保存图片到相册"权限。

### Q: 海报图片模糊？
A: 可以调整 `width` 参数增加分辨率。
