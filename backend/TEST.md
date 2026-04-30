# AI 面试系统后端 - 测试脚本

## 快速测试

以下是一些测试 API 的示例命令，使用 curl 或在 Postman 中测试。

### 1. 健康检查

```bash
curl http://localhost:3001/api/health
```

### 2. 用户注册

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "name": "Test User",
    "position": "Senior Backend Engineer"
  }'
```

### 3. 用户登录

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

保存返回的 token，用于后续请求。

### 4. 获取当前用户信息

```bash
curl http://localhost:3001/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5. 上传简历

首先准备一个 PDF 文件 `resume.pdf`，然后:

```bash
curl -X POST http://localhost:3001/api/uploads/resumes \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@resume.pdf"
```

### 6. 创建面试会话

```bash
curl -X POST http://localhost:3001/api/interviews \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "position": "Senior Backend Engineer",
    "company": "ByteDance",
    "interviewType": "technical",
    "difficulty": 4,
    "focusAreas": ["高并发架构", "MySQL优化"]
  }'
```

### 7. 获取面试会话详情

```bash
curl http://localhost:3001/api/interviews/SESSION_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 8. 获取当前问题

```bash
curl http://localhost:3001/api/interviews/SESSION_ID/questions/current \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 9. 提交回答

```bash
curl -X POST http://localhost:3001/api/interviews/SESSION_ID/answers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "我优化了数据库查询。当时响应时间很长，我通过添加索引来解决。"
  }'
```

### 10. 结束面试

```bash
curl -X POST http://localhost:3001/api/interviews/SESSION_ID/finish \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 11. 获取面试报告

```bash
curl http://localhost:3001/api/reports/SESSION_ID/report \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 12. 获取训练任务

```bash
curl http://localhost:3001/api/training-tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 13. 获取面试历史

```bash
curl http://localhost:3001/api/interviews/history \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 14. 埋点上报

```bash
curl -X POST http://localhost:3001/api/events/track \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "click_start_interview",
    "sessionId": "SESSION_ID",
    "data": {
      "source": "home_page",
      "jobRole": "Senior Backend Engineer"
    }
  }'
```

## 注意事项

1. 将 `YOUR_TOKEN_HERE` 替换为实际的 JWT token
2. 将 `SESSION_ID` 替换为实际的面试会话 ID
3. 测试前需要启动后端服务器: `npm run dev`
4. 确保 PostgreSQL 数据库已启动并配置正确

## 测试环境

开发环境可以直接在本地测试:

```bash
npm run dev
```

生产环境构建:

```bash
npm run build
npm start
```
