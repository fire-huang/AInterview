# 设计方案
## 基本信息
- 方案名称：面试房间设计方案
- 设计版本：01
- 对应 PRD：`PRD_files/3.0.0.md`

## 目标
- 实现多轮问答、追问、阶段推进和会话恢复。

## 数据结构
```ts
interface InterviewRoomState {
  sessionId: string
  currentStage: 'intro' | 'project' | 'technical' | 'scenario' | 'summary'
  currentQuestionId?: string
  currentQuestion?: string
  messages: Array<{
    id: string
    role: 'ai' | 'user'
    content: string
    questionType?: string
  }>
  instantFeedbackEnabled: boolean
  status: 'idle' | 'loading' | 'answering' | 'generating' | 'finished'
}
```

## 接口定义
```http
GET  /api/interviews/:sessionId
GET  /api/interviews/:sessionId/questions/current
POST /api/interviews/:sessionId/answers
POST /api/interviews/:sessionId/followups
POST /api/interviews/:sessionId/next-stage
POST /api/interviews/:sessionId/recover
POST /api/interviews/:sessionId/finish
```

## 主要步骤
1. 进入页面后恢复会话状态并获取当前问题。
2. 用户提交回答。
3. 后端评估回答质量。
4. 若需追问则返回追问，否则推进下一题或下一阶段。
5. 用户主动结束或完成全部阶段后生成报告。

## 关键实现点
- 消息流以 `messages` 数组维护。
- 追问问题通过 `parentQuestionId` 关联原问题。
- 发送失败时前端保留草稿。
- 刷新页面时优先调用恢复接口。

## 边缘情况
- 问题生成超时：允许重试或跳过
- 回答提交失败：保留文本
- 会话恢复失败：允许重新进入创建页
