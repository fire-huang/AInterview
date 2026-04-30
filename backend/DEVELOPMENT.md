# 开发指南

## 架构概览

后端采用 Express + TypeScript + Prisma 架构，支持 REST API 和 WebSocket 实时通信。

### WebSocket 双通道

后端同时运行两个 WebSocket 服务：

1. **Socket.IO** (`interview.ws.ts`) — 面试实时通信（消息推送、阶段变更）
2. **STT Proxy** (`stt-proxy.ws.ts`) — DashScope 语音识别代理

STT proxy 必须在 Socket.IO 之前注册 upgrade handler，否则 Socket.IO 会拦截所有 upgrade 请求。

### 语音识别流程（STT）

```
① 用户按住空格键 / 点击麦克风按钮
     ↓
② VideoRoom.tsx → startListening()
     ↓
③ useAlibabaSTT.ts:
   - GET /api/dashscope/config → 获取代理路径和模型参数
   - navigator.mediaDevices.getUserMedia() → 获取麦克风权限
   - 创建 AudioContext + ScriptProcessorNode（采集 PCM 音频）
   - WebSocket 连接 ws://localhost:3001/api/dashscope/stt-proxy?token=<JWT>
     ↓
④ WebSocket onopen → 发送 run-task 命令:
   { header: { action: "run-task", task_id, streaming: "duplex" },
     payload: { model: "paraformer-realtime-v2", parameters: { format: "pcm", sample_rate: 16000, ... } } }
     ↓
⑤ 后端 stt-proxy.ws.ts 收到 upgrade 请求:
   - verifyClient: 验证 JWT + 路径匹配 /api/dashscope/stt-proxy
   - handleUpgrade → 建立 clientWs → 连接 DashScope wss://dashscope.aliyuncs.com
   - 后端添加 Authorization: bearer <DASHSCOPE_API_KEY> header（浏览器无法加自定义 header）
   - 双向转发: 浏览器 ↔ 后端代理 ↔ DashScope
     ↓
⑥ ScriptProcessorNode onaudioprocess:
   - 采集麦克风 PCM 数据（浏览器采样率通常 48000Hz）
   - 线性插值重采样到 16kHz（DashScope 要求）
   - Float32 → Int16 PCM 转换
   - 以二进制帧发送到 WebSocket → 代理转发到 DashScope
     ↓
⑦ DashScope 返回 JSON 消息:
   - task-started → 开始录音，前端标记 isListening=true
   - result-generated (sentence_end=false) → 中间识别结果 → 显示灰色斜体文字
   - result-generated (sentence_end=true) → 最终识别结果 → 作为正式回答发送
   - task-failed → 错误处理
     ↓
⑧ 用户松开空格键 / 点击麦克风关闭 → stopListening():
   - 发送 finish-task 命令 (JSON)
   - cleanup(): 关闭 WS、断开麦克风、关闭 AudioContext
     ↓
⑨ 最终识别文字 → VideoRoom 发送用户消息:
   - Socket.IO 模式: sendUserMessage() → 后端 AI 评估 → 返回反馈+下一问题
   - REST fallback: question.answer() → 同步请求
```

**关键设计点：**

- **为什么走后端代理**：浏览器 WebSocket 无法设置自定义 Authorization header，DashScope 需要 bearer 认证，由后端代理添加
- **为什么直连 3001 端口**：Vite 的 ws 代理不转发 WebSocket upgrade 请求，前端必须直连后端
- **重采样**：浏览器 AudioContext 采样率通常 44100/48000Hz，DashScope 要求 16kHz PCM，前端做线性插值重采样
- **消息缓冲**：DashScope WS 连接建立前，前端发来的消息暂存 messageBuffer，连接就绪后依次转发

### 日志系统

使用 `logger` 工具替代 `console.log`，日志同时输出到终端和 `logs/app.log` 文件。
支持自动轮转（5MB/文件，最多3个备份文件）。

```typescript
import { logger } from '../utils/logger.util';
logger.info('Server started');
logger.error('Connection failed:', err.message);
```

### 请求日志中间件

每个 HTTP 请求自动记录到日志：

```
[2026-04-25T19:13:00.391Z] [INFO] GET /api/dashscope/config
```

## 数据模型 (Prisma)

8 个核心模型：User, Resume, InterviewSession, InterviewMessage, Report, TrainingTask, UserSettings, EventLog

面试会话状态流转：`pending → in_progress → completed / aborted`
面试阶段：`intro → project → technical → scenario → summary`

## 添加新功能

1. 在 `prisma/schema.prisma` 定义数据模型
2. `npx prisma generate` + `npx prisma migrate dev --name <name>`
3. `src/controllers/` 创建控制器
4. `src/routes/` 创建路由
5. `src/app.ts` 注册路由

## 错误处理

```typescript
import { asyncHandler } from '../middleware/error.middleware';

export const myController = asyncHandler(async (req, res) => {
  if (!data) throw new AppError('Not found', 404);
});
```

## 参数验证 (Zod)

```typescript
import { validate } from '../middleware/validation.middleware';
const schema = z.object({ name: z.string().min(1), email: z.string().email() });
router.post('/', validate(schema), controller);
```

## 已知配置问题

- **tsconfig `moduleResolution: "node"` 弃用警告**：VS Code 会提示 TypeScript 7.0 将弃用 `node10` 模式，但实际不影响编译和运行。不能改用 `"node16"`（需要 `module: "node16"`，与 `commonjs` 冲突），也不能加 `ignoreDeprecations`（ts-node 版本不支持会编译失败）。保持 `"node"` 即可，忽略 VS Code 警告。
- **Vite ws 代理不转发 WebSocket upgrade**：前端 STT WebSocket 必须直连后端 3001 端口，不能走 Vite 代理。

## Docker 数据库

```bash
cd backend
docker-compose up -d        # 启动 PostgreSQL (端口 5434)
docker-compose down         # 停止
docker-compose down -v      # 停止并删除数据
```

连接信息：`postgresql://postgres:postgres@localhost:5434/ainterview`