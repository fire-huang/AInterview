# 阶段文档
## 基本信息
- 阶段名称：构建数据模型
- 输入来源：`process_files/stage_02_extract_key_info_3_0_0.md`
- 输出版本：3.0.0
- 处理时间：2026年4月17日

## 输入
- 已提取核心功能、业务流程、页面流程和关键对象。

## 输出
### 枚举定义
```ts
type InterviewType = 'technical' | 'project' | 'hr'
type Difficulty = 'junior' | 'middle' | 'senior'
type SessionStatus = 'draft' | 'active' | 'paused' | 'finished' | 'failed'
type StageType = 'intro' | 'project' | 'technical' | 'scenario' | 'summary'
type QuestionType = 'basic' | 'project' | 'scenario' | 'hr' | 'followup'
type UploadSource = 'resume' | 'jd' | 'project_doc' | 'custom'
```

### 核心实体
```ts
interface User {
  id: string
  name: string
  email?: string
  preferredRole?: string
  defaultResumeId?: string
  createdAt: string
  updatedAt: string
}

interface Resume {
  id: string
  userId: string
  fileName: string
  fileType: 'pdf' | 'docx' | 'txt'
  fileSize: number
  storageUrl: string
  parseStatus: 'pending' | 'success' | 'failed'
  parsedSummary?: string
  createdAt: string
}

interface KnowledgeAsset {
  id: string
  userId: string
  sourceType: UploadSource
  title: string
  contentSummary?: string
  storageUrl?: string
  createdAt: string
}

interface InterviewSession {
  id: string
  userId: string
  role: string
  interviewType: InterviewType
  difficulty: Difficulty
  targetCompany?: string
  status: SessionStatus
  currentStage: StageType
  hasResume: boolean
  hasExtraMaterial: boolean
  startedAt?: string
  finishedAt?: string
  createdAt: string
}

interface InterviewPlan {
  id: string
  sessionId: string
  estimatedMinutes: number
  stageSequence: StageType[]
  focusTopics: string[]
  followupStrategy: string[]
  createdAt: string
}

interface QuestionNode {
  id: string
  sessionId: string
  stage: StageType
  questionType: QuestionType
  content: string
  parentQuestionId?: string
  orderNo: number
  createdAt: string
}

interface AnswerRecord {
  id: string
  sessionId: string
  questionId: string
  content: string
  answerLength: number
  qualityScore?: number
  weakTags?: string[]
  createdAt: string
}

interface Report {
  id: string
  sessionId: string
  totalScore: number
  technicalScore: number
  expressionScore: number
  projectScore: number
  stabilityScore: number
  summary: string
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  recommendedTopics: string[]
  status: 'pending' | 'ready' | 'failed'
  createdAt: string
}

interface TrainingTask {
  id: string
  userId: string
  sourceReportId: string
  weakTag: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'done'
  createdAt: string
}

interface EventLog {
  id: string
  userId?: string
  sessionId?: string
  eventName: string
  payload: Record<string, unknown>
  createdAt: string
}
```

## 关系说明
- `User` 1 对多 `Resume`
- `User` 1 对多 `InterviewSession`
- `InterviewSession` 1 对 1 `InterviewPlan`
- `InterviewSession` 1 对多 `QuestionNode`
- `QuestionNode` 1 对多 `AnswerRecord`
- `InterviewSession` 1 对 1 `Report`
- `Report` 1 对多 `TrainingTask`

## 模型设计结论
- 会话模型是全系统中心。
- 报告、训练和历史记录可以围绕 `InterviewSession + Report` 搭建。
- 资料上传与解析通过 `Resume` 和 `KnowledgeAsset` 统一管理。
