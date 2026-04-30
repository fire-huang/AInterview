# AInterview Frontend

React + TypeScript + Vite + Tailwind CSS

## 启动

```bash
npm install
npm run dev       # http://localhost:5173
```

## 功能

- 7 个核心页面：首页、创建面试、面试房间、报告、训练中心、历史、个人中心
- Socket.IO 实时面试通信
- DashScope STT 语音识别（通过后端 WebSocket 代理）
- 按住空格键 push-to-talk 语音输入
- 摄像头实时预览

## 构建

```bash
npm run build
```

## 说明

WebSocket 连接直连后端 3001 端口（Vite ws 代理不可靠），HTTP API 通过 Vite 代理转发。