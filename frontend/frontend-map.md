# Frontend 文件-功能映射

> 快速定位文件，避免扫描整个目录。

## 入口与路由

| 文件 | 功能 |
|------|------|
| `src/main.tsx` | 应用入口，StrictMode + 挂载 React 根 |
| `src/App.tsx` | HashRouter + AppProvider + 8 条路由 + AnimatePresence 页面切换动画 |

### 路由表

| 路径 | 页面组件 | 说明 |
|------|---------|------|
| `/` | Home | 首页仪表盘 |
| `/create` | Create | 创建面试 |
| `/room` | Room | 语音面试房间 |
| `/login` | Login | 登录 |
| `/register` | Register | 注册 |
| `/report` | Report | 面试报告 |
| `/profile` | Profile | 个人中心 |
| `/history` | History | 面试历史 |
| `*` | → `/` | 兜底重定向首页 |

## 页面 (pages/)

| 文件 | 功能 | 关键内容 |
|------|------|---------|
| `Home.tsx` | 首页仪表盘 | hero 区域、训练进度卡、任务列表、最近面试回顾 |
| `Create.tsx` | 创建面试表单 | 简历上传/选择、岗位、公司、面试类型、难度、侧重方向 |
| `Room.tsx` | 语音面试房间 | DashScope STT 语音输入、空格 push-to-talk 累积发送、CosyVoice TTS 语音播报、AI 对话、阶段进度、结束面试 |
| `Login.tsx` | 登录表单 | 邮箱+密码登录 |
| `Register.tsx` | 注册表单 | 姓名+邮箱+岗位+密码注册 |
| `Report.tsx` | 面试报告 | 综合评分（百分制）、四维指标、优缺点、建议、重新生成 |
| `Profile.tsx` | 个人中心 | 基本信息、简历管理、统计（百分制）、面试偏好（风格/详细度/语言）、登出 |
| `History.tsx` | 面试历史 | 类型/状态筛选、搜索、分页、查看报告/继续面试 |

## 组件 (components/)

| 文件 | 功能 |
|------|------|
| `Background.tsx` | 动态渐变背景，鼠标追踪交互 |
| `Navigation.tsx` | Navbar（含 auth 下拉菜单）、BackToTop、Footer |
| `UI.tsx` | 基础组件：Button、Card、Badge |
| `Visuals.tsx` | ProgressRing 动画 SVG 进度环（百分制） |

## 状态管理 (context/)

| 文件 | 功能 | 关键内容 |
|------|------|---------|
| `AppContext.tsx` | 全局状态 Provider | auth 状态、用户数据、语言切换（en/zh）、login/register/logout |

## Hooks (hooks/)

| 文件 | 功能 | 关键内容 |
|------|------|---------|
| `useSocketIO.ts` | Socket.IO 连接管理 | 连接/断开生命周期、面试事件 + TTS 事件监听（session_joined、ai_feedback、ai_question、ai_text_partial、tts_audio、tts_end、stage_changed、session_ended） |
| `useAlibabaSTT.ts` | DashScope STT 语音识别 | PCM 录音采集、16kHz 重采样、WebSocket 二进制帧推流、按键说话模式 |
| `useStreamingAudio.ts` | CosyVoice TTS 音频播放 | 接收完整 base64 音频 → AudioContext 解码一次性播放、AI 说话时抑制麦克风 |

## API 服务 (services/)

| 文件 | 功能 |
|------|------|
| `api.ts` | REST API 客户端，统一 request 函数 + 模块化命名空间 |

### API 模块

| 命名空间 | 端点 | 说明 |
|----------|------|------|
| `auth` | `/auth/register`, `/auth/login` | 注册、登录 |
| `user` | `/users/me` (GET/PATCH), `/users/me/resumes` | 用户信息、简历列表 |
| `resume` | `/uploads/resumes` (POST), `/resumes/:id` (DELETE) | 上传、删除简历 |
| `interview` | `/interviews` (POST), `/interviews/:id`, `/interviews/:id/recover`, `/interviews/:id/finish`, `/interviews/history` | 创建、获取、恢复、结束、历史 |
| `question` | `/interviews/:sid/questions/current`, `/interviews/:sid/answers`, `/interviews/:sid/followups`, `/interviews/:sid/next-stage` | 当前问题、回答、追问、下一阶段 |
| `report` | `/reports/:sid/report`, `/reports/:sid/report/regenerate` | 获取、重新生成报告 |
| `training` | `/training-tasks`, `/training-tasks/:id/complete` | 任务列表、标记完成 |
| `settings` | `/users/me/settings` (GET/PATCH) | 偏好设置（风格、速度、详细度、语言等） |
| `event` | `/events/track` | 事件追踪 |
| `azure` | `/azure/speech-token`, `/azure/speech-config` | Azure 语音服务（STT） |
| `dashscope` | `/dashscope/token`, `/dashscope/config`, `/dashscope/tts-config` | DashScope 语音服务：STT 配置 + TTS 配置 |
| `health` | `/health` | 健康检查 |

Auth token 存储于 `localStorage` 键 `ainterview_token`。

## 配置与类型

| 文件 | 功能 | 关键内容 |
|------|------|---------|
| `constants.ts` | 面试常量与 i18n | POSITION_OPTIONS（14 岗位）、INTERVIEW_TYPES（4 类型）、STAGE_ORDER（5 阶段）、STAGE_LABELS、TRANSLATIONS（en/zh 全量翻译，含 room.listening/micOff/voiceHint） |
| `types.ts` | TypeScript 类型 | User、DashboardState、ReviewSession、Task、Language |
| `lib/utils.ts` | 工具函数 | `cn()` — clsx 类名合并 |
| `index.css` | 全局样式 | Tailwind v4 @import + 主题定义 + base layer |

## 配置文件

| 文件 | 说明 |
|------|------|
| `vite.config.ts` | Vite 配置（react + tailwindcss 插件、端口 5173、API 代理 → localhost:3001） |
| `tsconfig.json` | TypeScript 严格模式配置 |
| `package.json` | 依赖与脚本（ainterview-frontend v0.1.0） |

---

# Backend 文件-功能映射

> 快速定位后端文件，避免扫描整个目录。

## 入口与路由

| 文件 | 功能 |
|------|------|
| `src/app.ts` | Express 应用入口，挂载路由、中间件、Socket.IO |
| `src/server.ts` | HTTP 服务器启动，集成 Socket.IO + STT WebSocket 代理 |

### API 路由

| 路径前缀 | 路由文件 | 说明 |
|----------|---------|------|
| `/api/auth` | `routes/auth.routes.ts` | 注册、登录 |
| `/api/users` | `routes/user.routes.ts` | 用户信息、简历列表 |
| `/api/uploads` | `routes/resume.routes.ts` | 简历上传 |
| `/api/resumes` | `routes/resume.routes.ts` | 简历删除 |
| `/api/interviews` | `routes/interview.routes.ts` | 面试 CRUD |
| `/api/reports` | `routes/report.routes.ts` | 报告获取、重新生成 |
| `/api/training-tasks` | `routes/training.routes.ts` | 训练任务 |
| `/api/azure` | `routes/azure.routes.ts` | Azure 语音 STT token/config |
| `/api/dashscope` | `routes/dashscope.routes.ts` | DashScope STT config + **TTS config** |
| `/api/health` | `routes/health.routes.ts` | 健康检查 |

## WebSocket

| 文件 | 功能 | 关键内容 |
|------|------|---------|
| `websocket/interview.ws.ts` | Socket.IO 面试事件 | user_message → AI 评估 → **TTS 合成完整音频推送 tts_audio + tts_end**（只播报问题，不播报评估）、stage_change、end_session、session_joined |
| `websocket/auth.ws.ts` | Socket.IO 认证中间件 | JWT token 验证 |
| `websocket/stt-proxy.ws.ts` | DashScope STT WebSocket 代理 | 双向转发浏览器 ↔ DashScope，JWT 认证，二进制/文本帧区分 |

## 服务 (services/)

| 文件 | 功能 | 关键内容 |
|------|------|---------|
| `ai.service.ts` | DeepSeek AI 服务 | generateQuestion、evaluateAnswer、evaluateAnswerStream（流式）、generateFollowup、generateReport |
| `tts.service.ts` | DashScope CosyVoice TTS | WebSocket 连接 DashScope 合成语音，收集所有音频 chunk 合并为完整 Buffer 一次性回调，使用 cosyvoice-v2 模型、continue-task 发送文本、MP3 格式 |

## 工具与配置

| 文件 | 功能 |
|------|------|
| `utils/prisma.util.ts` | Prisma 客户端实例 |
| `utils/logger.util.ts` | Winston 日志 |
| `middleware/auth.middleware.ts` | JWT 认证中间件 |
| `middleware/error.middleware.ts` | 异步错误处理 |
| `prisma/schema.prisma` | 数据库 schema（User、InterviewSession、InterviewMessage 含 audioUrl/duration 字段、Resume、Report、TrainingTask） |

## 配置文件

| 文件 | 说明 |
|------|------|
| `.env` | 环境变量：DASHSCOPE_API_KEY、DEEPSEEK_API_KEY、JWT_SECRET、PORT、TTS_MODEL（cosyvoice-v2）/TTS_VOICE/TTS_FORMAT |
| `package.json` | 依赖与脚本 |

---

# DashScope CosyVoice TTS 排错记录

> AI 语音提问功能从"完全没有声音"到"流畅只播问题"的完整排查过程。

## 问题与根因

### 1. 完全没有声音

| 根因 | 表现 | 修复 |
|------|------|------|
| `ws` npm 包未安装 | `tts.service.ts` import WebSocket 直接报错，后端启动失败或 TTS 模块不加载 | `npm install ws @types/ws` |
| Socket.IO token 键名不匹配 | `useSocketIO.ts` 用 `localStorage.getItem('token')`，项目统一用 `ainterview_token` → Socket.IO 认证失败 → 连接被拒 → 所有事件收不到 | 改为 `ainterview_token` |
| DashScope 模型名错误 | `cosyvoice-v2-flash` 不存在 → DashScope 返回 `ModelNotFound` + close code 1007 | 改为 `cosyvoice-v2` |
| DashScope 消息格式不兼容 | 所有消息（包括 JSON）都通过 binary frame 发送，不是 text frame → `ws.on('message')` 的 string 分支永远不触发 → `task-started`/`task-failed` 等事件被当作音频数据丢弃 | 先 `toString('utf8')` 判断是否 JSON 再解析 |
| DashScope 请求格式不正确 | 在 `run-task` 的 parameters 里直接放 `text` 导致 `Invalid payload data` (code 1007) | 用 `continue-task` 发送文本 + `text_type: 'PlainText'` 参数 + `finish-task` 结束 |

**排错技巧**：DashScope 的 binary frame 可能是 JSON 错误消息而非音频。用 `buf.toString('utf8')` 先检查是否以 `{` 开头，是则解析 JSON 拿到 `error_code` 和 `error_message`，否则才是音频二进制。

### 2. 文字重复出现两次

| 根因 | 表现 | 修复 |
|------|------|------|
| `handleSendAccumulated` 先本地加消息 → WebSocket `sendUserMessage` → 后端 `message_saved` 事件 → `onMessageSaved` 又加一次 | 用户消息在聊天区出现两次 | `onMessageSaved` 增加 content 重复检测：`m.role === 'user' && m.content === data.content` |

### 3. 声音重叠

| 根因 | 表现 | 修复 |
|------|------|------|
| feedback + followup/question 各调用一次 `synthesizeAndEmit` → 两个 DashScope WebSocket 同时推流 → 音频 chunk 交错到达前端 → 两段音频重叠播放 | 听到两段话混在一起 | 合并为单次 TTS 合成，只对问题部分播报 |

### 4. 语音卡顿/一卡一卡

| 根因 | 表现 | 修复 |
|------|------|------|
| 逐 chunk 推送 + 逐 chunk 解码播放 → 每个 chunk 需 `decodeAudioData`（异步耗时）→ 解码间隙产生空隙 | 声音断断续续 | 后端收集所有 audio chunk 合并为完整 Buffer → 一次性 `tts_audio` 事件发送 → 前端解码一整段直接播放 |

### 5. 说了对用户的评估内容

| 根因 | 表现 | 修复 |
|------|------|------|
| TTS 合成包含了 evaluation.feedback（对用户回答的点评）+ 下一问题 → 语音先说评估再说问题 | 听到"你的回答不错，但是..."然后才是问题 | TTS 只播报下一问题（followup 或 next question），feedback 仅文字显示不语音播报 |

## DashScope CosyVoice WebSocket 正确用法

```
1. 连接: new WebSocket('wss://dashscope.aliyuncs.com/api-ws/v1/inference/', { headers: { Authorization: 'bearer API_KEY' } })
2. 发送 run-task: { header: { action: 'run-task', task_id, streaming: 'duplex' }, payload: { task_group: 'audio', task: 'tts', function: 'SpeechSynthesizer', model: 'cosyvoice-v2', parameters: { text_type: 'PlainText', format: 'mp3', voice: 'longxiaochun_v2' }, input: {} } }
   ⚠️ run-task 的 parameters 里不放 text，input 必须为空对象 {}
3. 收到 task-started 后 → 发送 continue-task: { header: { action: 'continue-task', task_id, streaming: 'duplex' }, payload: { input: { text: '要合成的文字' } } }
4. 发送 finish-task: { header: { action: 'finish-task', task_id, streaming: 'duplex' }, payload: { input: {} } }
5. 收到消息全是 binary frame → 先 toString('utf8') 检查是否 JSON，否则是音频二进制
6. JSON 事件: task-started、result-generated（音频前兆）、task-finished（完成）
7. 音频二进制: 直接是 MP3 数据片段
```

## 关键配置

| 配置项 | .env 键 | 默认值 | 说明 |
|--------|--------|--------|------|
| TTS 模型 | `TTS_MODEL` | `cosyvoice-v2` | ⚠️ 不支持 `cosyvoice-v2-flash`，会返回 ModelNotFound |
| 音色 | `TTS_VOICE` | `longxiaochun_v2` | 内置音色 |
| 格式 | `TTS_FORMAT` | `mp3` | 浏览器原生支持解码 |
| Socket 事件 | — | `tts_audio` + `tts_end` | 完整音频一次推送，非逐 chunk |
| localStorage token | — | `ainterview_token` | ⚠️ 不是 `token`，不一致会导致 Socket.IO 认证失败 |