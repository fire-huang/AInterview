# 视频语音面试功能设计方案

## 基本信息
- 方案名称：视频语音面试设计方案
- 设计版本：01
- 对应 PRD：`PRD_files/3.0.0.md`

## 背景

AInterview 当前仅有纯文字面试模式（Room.tsx + REST API 同步调用）。用户希望通过**视频+语音**进行面试——开启摄像头模拟真实面试场景，用语音实时与 AI 面试官对话，AI 用语音提问，面试结束后可录像回放。目标是最接近真实面试的沉浸体验。

## 推荐方案：混合渐进架构（Client STT + Backend TTS 流式管线）

核心思路：STT（延迟最敏感）浏览器直连 Azure，TTS 走后端流式管线，逐句合成播放。

### 数据流

```
用户说话 → 浏览器Azure STT直连 → 识别文字 → Socket.IO发送 →
  后端接收文字 → DeepSeek流式评估 → 按句断句 → 每句Azure TTS →
    音频chunk经Socket.IO流式返回 → 前端AudioContext逐句播放

用户视频 → MediaRecorder录制 → 面试结束POST上传 → 后端存储 → 报告页回放
```

### 新增 npm 包

| 包 | 位置 | 用途 |
|---|---|---|
| `socket.io` | 后端 | WebSocket 服务器 |
| `socket.io-client` | 前端 | WebSocket 客户端 |
| `microsoft-cognitiveservices-speech-sdk` | 前端 | Azure STT（语音识别） |
| `microsoft-cognitiveservices-speech-sdk` | 后端 | Azure TTS（语音合成） |

### 后端修改

**app.ts**：在 createServer 后挂载 Socket.IO，配置 CORS 匹配现有 Express CORS。

新增文件：
- `src/services/tts.service.ts` — Azure TTS 包装，配置世纪互联/全球端点，逐句合成返回音频流
- `src/services/ai-pipeline.service.ts` — 核心管线：接收用户文字 → DeepSeek streaming → 断句检测 → 逐句 TTS → Socket.IO emit 音频chunk
- `src/websocket/interview.ws.ts` — Socket.IO 事件：join_session, user_speech_complete, ai_text_partial, tts_chunk, tts_end, stage_change, end_session
- `src/websocket/auth.ws.ts` — Socket.IO JWT 认证中间件
- `src/routes/azure.routes.ts` — GET /api/azure/speech-token（STT临时令牌）、GET /api/azure/speech-config（端点URL配置）
- `src/routes/video.routes.ts` — POST /api/interviews/:sessionId/video-upload（视频上传）

修改文件：
- `src/services/ai.service.ts` — 新增 evaluateAnswerStream() 使用 DeepSeek stream: true 模式

### 前端修改

新增文件：
- `src/pages/VideoRoom.tsx` — 视频面试房间（摄像头预览、STT、流式音频播放、阶段进度侧栏）
- `src/hooks/useAzureSTT.ts` — Azure STT hook（令牌获取、连续识别、暂停/恢复控制）
- `src/hooks/useStreamingAudio.ts` — 流式音频播放 hook（AudioContext 渐进渲染、chunk队列、无缝衔接）
- `src/hooks/useMediaRecorder.ts` — 视频录制 hook（摄像头+MediaRecorder、开始/停止、blob输出）
- `src/hooks/useSocketIO.ts` — Socket.IO 连接管理 hook

修改文件：
- `src/pages/Create.tsx` — 添加面试模式选择器（文字面试 / 视频面试）
- `src/App.tsx` — 根据模式路由到 VideoRoom 或 Room
- `src/services/api.ts` — 新增令牌获取、视频上传接口调用

### 数据库 Schema 变更

```prisma
model InterviewSession {
  // 新增：
  mode          String          @default("text")   // "text" or "video"
  videoUrl      String?         // 录像文件存储路径/URL
}

model InterviewMessage {
  // 新增：
  audioUrl      String?         // AI 语音片段存储URL
  sttConfidence Float?          // STT 识别置信度
  duration      Int?            // 音频时长(ms)
}
```

### 阿里云百炼平台配置（替代 Azure Speech）

由于用户无国际信用卡无法使用 Azure，改用阿里云百炼平台（DashScope）：
- 注册简单（手机号+实名认证），无需信用卡
- STT：Paraformer 实时语音识别，WebSocket 直连
- TTS：CosyVoice 流式合成（Phase 3）

```
# .env — 阿里云百炼平台
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxx

# .env — Azure（备用，如后续获得密钥可切换）
# AZURE_SPEECH_KEY=<你的密钥>
# AZURE_SPEECH_REGION=chinaeast2
# AZURE_SPEECH_ENDPOINT=https://chinaeast2.api.cognitive.azure.cn
```

阿里云百炼平台申请步骤：
1. 打开 https://bailian.console.aliyun.com/
2. 阿里云账号登录（手机号注册+实名认证）
3. 开通「模型服务灵积」→ 免费额度自动生效
4. 在「API-KEY管理」创建 API Key
5. 在「语音识别」确认 Paraformer 模型已开通

### 关键挑战与应对

1. **反馈回路**：AI说话时麦克风拾取TTS音频 → 实现轮次切换协议：TTS播放时暂停STT
2. **断句检测**：DeepSeek流式输出token而非句子 → 用正则 `/.*[.!?。！？；\n]/` 检测中英文句末，strip markdown后再检测
3. **流式音频播放**：渐进chunk播放技术复杂 → AudioContext + PCM队列 + 无缝衔接调度
4. **浏览器兼容性**：MediaRecorder codec差异 → 检测 isTypeSupported()，优先 WebM（Chrome 主流）
5. **网络中断恢复**：Socket.IO自动重连 + Azure STT recognizer 重初始化

## Phase 1 实施方案：实时文字通信基础（已完成）

### 已完成的修改
- 后端挂载 Socket.IO（`app.ts`、`auth.ws.ts`、`interview.ws.ts`）
- 前端 useSocketIO hook，Room.tsx 改用 WebSocket 通信 + REST fallback
- DeepSeek streaming 模式支持（`ai.service.ts` 新增 `evaluateAnswerStream`）
- Schema 添加 `mode`、`videoUrl`、`audioUrl`、`sttConfidence`、`duration` 字段
- Azure routes（`speech-token`、`speech-config`）和 video routes 已创建

---

## Phase 2 实施方案：Azure STT 语音输入（当前阶段）

### 背景
Phase 1 已完成。Phase 2 添加语音输入功能：用户说话 → 浏览器直连 Azure STT → 识别为文字 → Socket.IO 发送 → AI 仍以文字回复。摄像头预览用于营造沉浸感，暂不录像（Phase 4）。核心约束：需同时支持 Azure 全球版和世纪互联版。

### 任务 1：安装 Azure Speech SDK
- 在 `frontend/` 执行 `npm install microsoft-cognitiveservices-speech-sdk`
- 修改文件：`frontend/package.json`

### 任务 2：修复后端 Azure 路由支持世纪互联
- **文件**：`backend/src/routes/azure.routes.ts`
- 当前问题：`/speech-token` 端点硬编码 `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`
- 修改方案：从 `AZURE_SPEECH_ENDPOINT` 环境变量判断域名
  - endpoint 包含 `.azure.cn` → 使用世纪互联域名 `https://${region}.api.cognitive.azure.cn/sts/v1.0/issueToken`
  - 否则 → 使用全球域名 `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`

### 任务 3：更新后端面试控制器支持 `mode` 字段
- **文件**：`backend/src/controllers/interview.controller.ts`
- 当前代码从 `req.body` 解构时未包含 `mode`
- 修改：在解构列表加入 `mode`，在 Prisma `data` 对象加入 `mode: mode || 'text'`，响应中也加入 `mode`

### 任务 4：创建 `useAzureSTT.ts` Hook
- **文件**：`frontend/src/hooks/useAzureSTT.ts`（新建）
- 使用 `microsoft-cognitiveservices-speech-sdk`（SpeechConfig、SpeechRecognizer）
- 流程：获取 token + config → `SpeechConfig.fromAuthorizationToken(token, region)` → 创建 recognizer → 连续识别
- 对外接口：
  ```typescript
  interface UseAzureSTTOptions {
    onRecognized?: (text: string, confidence: number) => void;
    onRecognizing?: (text: string) => void;
    onError?: (error: string) => void;
  }
  interface UseAzureSTTReturn {
    isListening: boolean;
    isReady: boolean;
    startListening: () => void;
    stopListening: () => void;
    error: string;
  }
  ```
- 世纪互联兼容：根据 config 返回的 endpoint 判断是否使用 `.azure.cn` 域名

### 任务 5：创建 `VideoRoom.tsx` 页面
- **文件**：`frontend/src/pages/VideoRoom.tsx`（新建）
- 布局复用 Room.tsx（侧栏+聊天区），新增：
  - 摄像头预览小窗口
  - 麦克风按钮（开始/停止监听 + 脉冲动画）
  - 语音中间识别结果作为"正在输入"提示
- 使用 `useSocketIO` + `useAzureSTT`
- 流程：点击麦克风 → STT 监听 → 最终识别文字 → Socket.IO 发送 → AI 文字回复
- 保留文字输入框作为备选
- 阶段进度侧栏与 Room.tsx 一致

### 任务 6：添加 `INTERVIEW_MODES` 常量 + 国际化键值
- **文件**：`frontend/src/constants.ts`
- 新增：`INTERVIEW_MODES = [{ value: 'text', labelZh: '文字面试', labelEn: 'Text Interview' }, { value: 'video', labelZh: '视频面试', labelEn: 'Video Interview' }]`
- 新增 `videoRoom.*` 国际化键值：title, micOn, micOff, cameraOn, cameraOff, listening, hint, confirmEnd

### 任务 7：在 Create.tsx 添加模式选择器
- **文件**：`frontend/src/pages/Create.tsx`
- 新增 `mode` 状态 + 两个模式切换卡片（文字面试/视频面试）
- `handleSubmit` 传递 `body.mode = mode`
- 文字模式导航到 `/room`，视频模式导航到 `/video-room`

### 任务 8：添加 `/video-room` 路由 + App.tsx 布局
- **文件**：`frontend/src/App.tsx`
- 添加 `<Route path="/video-room">` + VideoRoom 导入
- `isVideoRoomPage` 判断：隐藏导航栏/页脚，紧凑布局

### 验证方式
1. `npm ls microsoft-cognitiveservices-speech-sdk` 显示安装
2. 后端/前端 TypeScript 编译通过
3. Azure 路由返回 token + config（世纪互联域名正确）
4. 模式选择器：选择视频面试 → 导航到 `/video-room?sessionId=...`
5. VideoRoom 页面不崩溃；UI 正确渲染
6. 文字模式（Room.tsx）完全不受影响

## 后续阶段规划

- **Phase 3**：AI 语音输出（Azure TTS 流式管线） — 后端 tts.service.ts + ai-pipeline.service.ts，前端 useStreamingAudio hook
- **Phase 4**：视频录制 + 回放 — 前端 useMediaRecorder hook，报告页视频回放
- **Phase 5**：视频行为分析（未来迭代，不在当前范围）