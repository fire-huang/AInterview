# AI 面试系统后端

Node.js + Express + TypeScript + PostgreSQL + Prisma

## 快速启动

```bash
cd backend
cp .env.example .env          # 配置数据库和 API 密钥
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

服务器在 `http://localhost:3001` 运行。

## 技术栈

| 类别 | 技术 |
|------|------|
| 运行时 | Node.js 20+ |
| 框架 | Express.js |
| 语言 | TypeScript 5.8+ |
| 数据库 | PostgreSQL 15+ (Docker 端口 5434) |
| ORM | Prisma 5.11+ |
| 认证 | JWT (jsonwebtoken + bcryptjs) |
| AI | DeepSeek API / DashScope STT |
| 验证 | Zod |
| 实时通信 | Socket.IO + WebSocket STT proxy |

## 项目结构

```
backend/
├── src/
│   ├── controllers/          # 路由控制器
│   ├── routes/               # 路由定义
│   ├── middleware/           # auth, error, validation, upload
│   ├── services/             # ai.service, dashscope.service
│   ├── websocket/            # interview.ws (Socket.IO), stt-proxy.ws
│   ├── utils/                # prisma, jwt, logger
│   └── app.ts                # Express 入口
├── prisma/
│   └── schema.prisma         # 8 个数据模型
├── logs/                     # 运行日志 (自动写入)
├── uploads/                  # 文件上传目录
└── .env                      # 环境变量
```

## API 接口

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录

### 用户
- `GET /api/users/me` - 获取当前用户
- `PATCH /api/users/me` - 更新用户信息

### 简历
- `POST /api/uploads/resumes` - 上传简历
- `GET /api/users/me/resumes` - 简历列表
- `DELETE /api/resumes/:id` - 删除简历

### 面试
- `POST /api/interviews` - 创建面试会话
- `GET /api/interviews/:id` - 面试详情
- `POST /api/interviews/:id/recover` - 恢复面试
- `POST /api/interviews/:id/finish` - 结束面试

### 问答
- `GET /api/interviews/:id/questions/current` - 当前问题
- `POST /api/interviews/:id/answers` - 提交回答
- `POST /api/interviews/:id/next-stage` - 推进阶段

### 报告 & 训练
- `GET /api/reports/:sessionId/report` - 面试报告
- `POST /api/reports/:sessionId/report/regenerate` - 重生成报告
- `GET /api/training-tasks` - 训练任务列表
- `POST /api/training-tasks/:id/complete` - 完成训练

### 历史 & 其他
- `GET /api/interviews/history` - 面试历史
- `POST /api/events/track` - 埋点上报
- `GET /api/health` - 健康检查
- `GET /api/dashscope/config` - STT 配置

### WebSocket
- `ws://localhost:3001/api/dashscope/stt-proxy?token=<JWT>` - STT 语音识别代理
- Socket.IO 实时面试通信

## 响应格式

成功: `{ "code": 0, "message": "ok", "data": {} }`
错误: `{ "code": 404, "message": "Not found" }`
认证: `Authorization: Bearer <token>`

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 服务端口 | 3001 |
| DATABASE_URL | PostgreSQL 连接 | - |
| JWT_SECRET | JWT 密钥 | - |
| JWT_EXPIRES_IN | JWT 过期时间 | 7d |
| DEEPSEEK_API_KEY | DeepSeek AI 密钥 | - |
| DEEPSEEK_BASE_URL | DeepSeek API 地址 | https://api.deepseek.com |
| DASHSCOPE_API_KEY | DashScope STT 密钥 | - |
| CORS_ORIGIN | CORS 源 | http://localhost:5173 |

## 更多文档

- [DEVELOPMENT.md](./DEVELOPMENT.md) - 开发指南和架构说明
- [TEST.md](./TEST.md) - API 测试示例