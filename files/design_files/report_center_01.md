# 设计方案
## 基本信息
- 方案名称：面试报告设计方案
- 设计版本：01
- 对应 PRD：`PRD_files/3.0.0.md`

## 目标
- 输出结构化结果并推动用户进入下一次训练。

## 数据结构
```ts
interface ReportViewModel {
  sessionId: string
  totalScore: number
  scoreBreakdown: {
    technical: number
    expression: number
    project: number
    stability: number
  }
  summary: string
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  recommendedTopics: string[]
  status: 'pending' | 'ready' | 'failed'
}
```

## 接口定义
```http
GET  /api/interviews/:sessionId/report
POST /api/interviews/:sessionId/report/regenerate
POST /api/events/track
```

## 主要步骤
1. 面试结束后轮询或查询报告状态。
2. 报告就绪后展示总评、维度分和建议。
3. 用户可选择再次训练、查看历史或导出摘要。

## 展示重点
- 不只显示分数，还要显示原因和建议。
- 推荐训练主题必须与弱点标签相关。

## 边缘情况
- 报告失败时支持单独重试
- 报告内容不完整时先展示已生成部分
