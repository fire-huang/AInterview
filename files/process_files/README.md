# 作用
主要存储阶段性的信息，在每个阶段执行后，生成对应的md文件，并把输入输出存入进去，也包含版本，存入地址在/process_files文件夹下

# 阶段

## 接收PRD
### 输入模板
在线书店 PRD
1. 目标用户
大学生群体
2. 核心功能
- 图书搜索与浏览
- 购物车与下单
- 用户评价系统

### 输出模板
✅ 文档结构解析完成

识别到:
- 标题层级: 3 层
- 功能模块: 3 个
- 用户角色: 1 类

## 提取关键信息
### 输入模板
解析后的 PRD 文档结构
含 3 个功能模块定义

### 输出模板
用户画像: 大学生, 18-25岁

核心功能:
  1. 图书搜索 (关键词/分类)
  2. 购物车 (增删改查)
  3. 评价系统 (评分+文字)

业务流程:
  搜索 → 加购 → 下单 → 评价

## 构建数据模型
### 输入模板
提取的关键信息:
- 图书、用户、订单、评价
- 搜索/购物车/评价流程

### 输出模板
interface Book {
  id: string
  title: string
  author: string
  price: number
  category: string
}

interface Order {
  id: string
  userId: string
  items: OrderItem[]
  status: OrderStatus
}

## 设计API
### 输入模板
数据模型:
Book, Order, Review, User
各含完整字段定义

### 输出模板
GET    /api/books?q=&cat=
GET    /api/books/:id
POST   /api/cart/items
DELETE /api/cart/items/:id
POST   /api/orders
GET    /api/orders/:id
POST   /api/reviews
GET    /api/books/:id/reviews