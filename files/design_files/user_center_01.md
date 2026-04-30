# 设计方案
## 基本信息
- 方案名称：个人中心设计方案
- 设计版本：01
- 对应 PRD：`PRD_files/3.0.0.md`

## 目标
- 管理默认岗位方向、默认简历和数据删除入口。

## 数据结构
```ts
interface UserProfileForm {
  name: string
  preferredRole?: string
  defaultResumeId?: string
}
```

## 接口定义
```http
GET    /api/users/me
PATCH  /api/users/me
GET    /api/users/me/resumes
DELETE /api/resumes/:resumeId
DELETE /api/interviews/history/:sessionId
```

## 主要步骤
1. 加载用户资料和简历列表。
2. 修改默认岗位或默认简历。
3. 提交更新并提示成功。
4. 对数据删除操作增加二次确认。

## 边缘情况
- 无默认简历时给出上传引导
- 删除默认简历后需要重新选择默认项
