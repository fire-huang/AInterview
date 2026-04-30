# 设计方案
## 基本信息
- 方案名称：系统总体技术实现方案
- 设计版本：01
- 对应 PRD：`PRD_files/3.0.0.md`
- 状态：待确认后进入编码阶段

## 目标
提供 AI 面试模拟系统的总体技术实现方案，覆盖技术选型、系统模块、核心数据结构、接口分组和实施步骤。

## 技术选型建议
若当前仓库没有既定技术栈约束，推荐如下：
- 前端：React + TypeScript + Next.js
- UI：Tailwind CSS 或组件库 + 自定义业务组件
- 后端：Node.js + NestJS
- 数据库：PostgreSQL
- 缓存 / 会话：Redis
- 对象存储：本地开发可文件系统，生产建议对象存储
- 大模型接入：统一 AI Provider Gateway，便于切换模型

## 系统模块
| 模块 | 职责 |
| --- | --- |
| Web 前端 | 页面渲染、会话交互、状态展示、埋点上报 |
| API 服务 | 业务编排、权限校验、数据读写 |
| 资料解析服务 | 简历 / JD / 补充资料解析 |
| 面试编排服务 | 负责阶段推进、问题与追问控制 |
| 报告服务 | 汇总评分、生成建议与训练任务 |
| 埋点服务 | 采集前后端事件和链路耗时 |

## 核心数据结构
核心实体建议沿用以下对象：
- User
- Resume
- KnowledgeAsset
- InterviewSession
- InterviewPlan
- QuestionNode
- AnswerRecord
- Report
- TrainingTask
- EventLog

## 接口定义
### 核心接口分组
- 用户与资料：`/api/users/me`、`/api/uploads/*`
- 会话创建：`/api/interviews`
- 面试问答：`/api/interviews/:sessionId/*`
- 报告与训练：`/api/interviews/:sessionId/report`、`/api/training-tasks`
- 埋点：`/api/events/track`

### 建议返回格式
```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

## 主要步骤
1. 实现首页、创建面试页、面试房间、报告页主链路。
2. 接入资料上传与解析。
3. 实现会话编排、问题生成、追问逻辑。
4. 实现报告生成与训练任务推荐。
5. 补充历史记录、个人中心与数据管理。
6. 完成埋点、异常恢复和性能优化。

## 依赖关系
- 创建面试依赖用户资料与上传服务。
- 面试房间依赖会话服务、问题服务和恢复能力。
- 报告页依赖报告生成服务。
- 训练中心依赖报告与弱点标签。

## 风险提示
- 若 AI 返回内容不稳定，需要加业务层校验。
- 若先不做流式输出，会影响面试房间体验，但实现更简单。
- 若没有统一 Provider 封装，后续模型切换成本会升高。

## 结论
这份方案满足 `design_files/README.md` 中“先给出技术实现方案，包括数据结构、接口定义、主要步骤”的要求，可作为后续编码前确认的总方案。
