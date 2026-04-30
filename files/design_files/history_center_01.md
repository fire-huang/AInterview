# 设计方案
## 基本信息
- 方案名称：历史记录设计方案
- 设计版本：01
- 对应 PRD：`PRD_files/3.0.0.md`

## 目标
- 提供历史面试记录查看、筛选和再次训练入口。

## 数据结构
```ts
interface HistoryRecordItem {
  sessionId: string
  role: string
  interviewType: string
  status: string
  totalScore?: number
  weakTags?: string[]
  finishedAt?: string
}
```

## 接口定义
```http
GET    /api/interviews/history
GET    /api/interviews/history/:sessionId
DELETE /api/interviews/history/:sessionId
```

## 主要步骤
1. 拉取历史记录列表。
2. 根据岗位、面试类型和时间进行筛选。
3. 点击某条记录进入报告详情或再次训练。

## 边缘情况
- 无记录时展示空状态
- 删除失败时仅提示失败，不影响列表数据
