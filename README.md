# Shopify AI Preview System

一个基于 **Next.js + Vercel + AWS S3** 的 Shopify AI 商品效果图系统。  
当前版本已切换为 **轻量 S3 存储模式**：

- 图片存 S3
- 后台配置存 S3 JSON
- 模型 API Key 加密后存 S3 JSON
- 生成记录存 S3 JSON
- 不强依赖数据库

## 已实现

- Shopify 商品页上传图片后生成 AI 效果图
- 按产品类型自动匹配提示词
- 独立商家后台：
  - 提示词管理
  - 默认模型切换
  - 模型 API Key / webhook 保存
  - 生成记录查看
  - 统计仪表盘
  - Shopify 安装代码复制
  - S3 现有资源导入
- 原图 / 生成图自动存 S3
- 订单通过 line item properties 带上：
  - generation id
  - 效果图链接
  - 模型
  - 提示词
- Shopify 订单 webhook 回写订单号与客户信息

## 技术栈

- Next.js App Router
- Vercel Serverless / Node runtime
- AWS S3（图片 + 配置 + 记录）
- OpenAI GPT Image 1（内置）
- Flux / Stable Diffusion / Midjourney / Custom model（Webhook 扩展）

## 为什么现在不需要数据库

你目前数据量不大，且核心需求是：

- 图片存储
- 提示词配置
- API Key 配置
- 生成记录留档
- 订单回写

这些都可以直接落在 S3 里，用一个 `system/app-state.json` 管理。  
优点：

- 成本低
- 部署简单
- 不需要额外数据库
- 后续真要升级，再切 Supabase / Postgres 也很容易

## 但有一个必须说明

**Vercel Cache 不能当“永久配置数据库”，也不适合存 API Key。**

当前更安全的做法是：

- 只保留一个服务端 `AUTH_SECRET` 环境变量
- 后台填写的模型 API Key 用这个密钥加密
- 加密后的内容保存到 S3 JSON

也就是说：

- **模型 API Key 不需要放环境变量**
- **但系统仍然至少需要一个服务端加密密钥**

## 本地启动

1. 复制环境变量

```bash
cp .env.example .env
```

2. 填写：

- S3 bucket
- S3 access key / secret
- 管理员账号
- AUTH_SECRET

3. 安装依赖

```bash
npm install
```

4. 启动

```bash
npm run dev
```

## Shopify 接入

把以下文件中的代码贴到商品页模板中：

- `/D:/AI生图项目/ai-shopify-preview/shopify/snippets/ai-preview-widget.liquid`

或者后台 `/admin/install` 页面中直接复制。

## 订单关联逻辑

1. 商品页生成成功后，把以下字段写入商品表单：
   - `properties[_AI Generation ID]`
   - `properties[_AI Preview URL]`
   - `properties[_AI Model]`
   - `properties[_AI Prompt]`
2. Shopify 创建订单后调用：
   - `POST /api/shopify/orders`
3. 后端根据 `_AI Generation ID` 回写订单号 / 邮箱 / customer id

## 推荐部署

- App：Vercel
- 文件与状态：AWS S3
- 域名：自定义域名后填入 `NEXT_PUBLIC_APP_URL`

## 后续还可以继续做

- Shopify OAuth 安装版
- 多店铺支持
- Prompt versioning
- 多图上传 / 批量生成
- 自动重试 / 队列 / webhook 回调
- 前台直接展示从 S3 导入的已有资源
