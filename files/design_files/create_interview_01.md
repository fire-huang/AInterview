# 设计方案
## 基本信息
- 方案名称：创建面试设计方案
- 设计版本：01
- 对应 PRD：`PRD_files/3.0.0.md`

## 目标
- 收集足够信息生成面试计划。
- 在最少操作下让用户进入面试房间。

## 数据结构
```ts
interface CreateInterviewForm {
  role: string
  interviewType: 'technical' | 'project' | 'hr'
  difficulty: 'junior' | 'middle' | 'senior'
  targetCompany?: string
  resumeId?: string
  extraAssetIds?: string[]
  note?: string
}
```

## 接口定义
```http
POST /api/uploads/resumes
POST /api/uploads/assets
POST /api/interviews
POST /api/interviews/:sessionId/plan
POST /api/interviews/:sessionId/start
```

## 主要步骤
1. 用户填写表单并上传资料。
2. 前端校验必填项。
3. 创建会话。
4. 后端生成面试计划。
5. 进入面试房间。

## 前端状态
- 初始：空表单
- 提交中：按钮 loading
- 成功：跳转到面试房间
- 失败：保留表单内容并提示重试

## 后端职责
- 校验用户输入
- 绑定简历和资料
- 生成 `InterviewSession`
- 生成 `InterviewPlan`

## 边缘情况
- 简历解析失败时允许直接创建基础会话
- 创建成功但计划生成失败时支持重试计划生成
