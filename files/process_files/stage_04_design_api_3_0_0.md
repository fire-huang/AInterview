# 阶段文档
## 基本信息
- 阶段名称：设计API
- 输入来源：`process_files/stage_03_build_data_model_3_0_0.md`
- 输出版本：3.0.0
- 处理时间：2026年4月17日

## 输入
- 已明确核心数据模型与对象关系。

## 输出
### 用户与资料
```http
GET    /api/users/me
PATCH  /api/users/me
GET    /api/users/me/resumes
POST   /api/uploads/resumes
POST   /api/uploads/assets
DELETE /api/resumes/:resumeId
DELETE /api/assets/:assetId
```

### 创建面试
```http
POST   /api/interviews
GET    /api/interviews/:sessionId
POST   /api/interviews/:sessionId/plan
POST   /api/interviews/:sessionId/start
POST   /api/interviews/:sessionId/recover
```

### 面试会话
```http
GET    /api/interviews/:sessionId/questions/current
POST   /api/interviews/:sessionId/answers
POST   /api/interviews/:sessionId/followups
POST   /api/interviews/:sessionId/next-stage
POST   /api/interviews/:sessionId/finish
```

### 报告与训练
```http
GET    /api/interviews/:sessionId/report
POST   /api/interviews/:sessionId/report/regenerate
GET    /api/training-tasks
POST   /api/training-tasks/:taskId/start
POST   /api/training-tasks/:taskId/complete
```

### 历史记录
```http
GET    /api/interviews/history
GET    /api/interviews/history/:sessionId
DELETE /api/interviews/history/:sessionId
```

### 埋点与日志
```http
POST   /api/events/track
GET    /api/health
```

## 接口分组说明
- 用户接口：管理个人基础信息、默认岗位与默认简历。
- 上传接口：统一处理简历和补充资料上传。
- 会话接口：负责创建、启动、恢复与结束面试。
- 问答接口：负责问题获取、回答提交、追问触发与阶段推进。
- 报告接口：负责报告获取与失败重试。
- 训练接口：负责推荐任务与训练状态维护。

## API 设计结论
- 建议以 REST API 为主，便于和页面模块一一对应。
- 长耗时任务需提供明确状态字段，避免前端无感等待。
- 面试会话和报告生成链路是后端优先实现部分。
