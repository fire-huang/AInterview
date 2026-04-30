# 设计方案
## 基本信息
- 方案名称：训练中心设计方案
- 设计版本：01
- 对应 PRD：`PRD_files/3.0.0.md`

## 目标
- 基于报告结果生成可复用的训练任务。

## 数据结构
```ts
interface TrainingTaskItem {
  id: string
  weakTag: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'done'
  sourceReportId: string
}
```

## 接口定义
```http
GET  /api/training-tasks
POST /api/training-tasks/:taskId/start
POST /api/training-tasks/:taskId/complete
POST /api/interviews
```

## 主要步骤
1. 报告生成后产出训练任务。
2. 训练中心按弱点标签聚合任务。
3. 用户可直接基于某个弱点发起下一轮面试。

## 边缘情况
- 无任务时显示空状态
- 任务启动失败时允许再次尝试
