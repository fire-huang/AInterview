# 设计文件说明

各功能模块的初始设计方案，对应 PRD `PRD_files/3.0.0.md`。

新增功能时：先在本文件夹创建设计 md 文件，加入下方映射，并标注版本号。

## 文件映射

| 文件名 | 对应模块 | 设计版本 | 说明 |
| --- | --- | --- | --- |
| `system_solution_01.md` | 系统总体方案 | 01 | 总体技术实现方案，含数据结构、接口定义、主要步骤 |
| `home_entry_01.md` | 首页与入口 | 01 | 首页数据与交互方案 |
| `create_interview_01.md` | 创建面试 | 01 | 创建面试页的数据结构、接口和步骤 |
| `interview_room_01.md` | 面试房间 | 01 | 多轮问答、追问、恢复与结束方案 |
| `report_center_01.md` | 面试报告 | 01 | 报告生成与展示方案 |
| `training_center_01.md` | 训练中心 | 01 | 训练任务与复训方案 |
| `history_center_01.md` | 历史记录 | 01 | 历史记录列表和操作方案 |
| `user_center_01.md` | 个人中心 | 01 | 默认资料和数据管理方案 |
| `video_voice_interview_01.md` | 视频语音面试 | 01 | 视频语音面试功能设计 — **Phase 1 已完成**（Socket.IO 实时通信），**Phase 2 已完成**（DashScope STT 语音输入 + push-to-talk），后续阶段待实施 |

## 注意

设计文件是初始方案参考，实际实现可能已调整（如 AI 服务从 DeepSeek 改为 Gemini，STT 从 Azure 改为 DashScope）。具体实现以代码为准。