# 设计方案
## 基本信息
- 方案名称：首页与入口设计方案
- 设计版本：01
- 对应 PRD：`PRD_files/3.0.0.md`

## 目标
- 让首次用户快速理解产品价值并进入创建面试页。
- 让回访用户快速进入历史记录、训练中心或继续训练。

## 数据结构
```ts
interface HomeViewModel {
  isNewUser: boolean
  latestSession?: {
    sessionId: string
    role: string
    status: string
  }
  latestReport?: {
    sessionId: string
    totalScore: number
    weakTags: string[]
  }
}
```

## 接口定义
```http
GET /api/users/me
GET /api/interviews/history?limit=1
GET /api/training-tasks?limit=3
```

## 主要步骤
1. 页面加载时拉取用户基础信息。
2. 拉取最近一次面试和最近训练任务。
3. 根据 `isNewUser` 渲染首访或回访内容。
4. 点击 CTA 跳转到创建面试页。

## UI 结构
- 顶部导航
- Hero 主 CTA
- 推荐岗位卡片
- 最近训练摘要
- 数据安全与 FAQ

## 边缘情况
- 没有历史记录时只展示首次训练引导。
- 拉取失败时展示重试按钮，不阻断 CTA。
