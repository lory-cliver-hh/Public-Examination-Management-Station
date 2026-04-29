# Supabase 初始化与共享数据

这份文档对应当前项目已经完成的“同账号多设备共享”版本。

目标效果：

- 两台电脑都能登录同一个平台
- 使用同一个邮箱账号后，共享同一份学习数据
- 课程状态、打卡、学习记录、刷题记录、模考成绩、倒计时、待办、错题本都会写入云端

## 1. 创建 Supabase 项目

进入：

- [Supabase Dashboard](https://supabase.com/dashboard)

创建一个新项目后，记下：

- `Project URL`
- `Publishable Key`

## 2. 执行数据库初始化 SQL

打开 Supabase 项目的 `SQL Editor`，执行：

- [supabase/init.sql](../supabase/init.sql)

这一步会创建：

- `public.user_state` 共享状态表
- `mistake-images` 私有存储桶
- 用户只能访问自己数据的 RLS 策略
- 新用户注册后自动初始化状态行的触发器

## 3. 配置环境变量

复制：

- [.env.example](../.env.example)

重命名为：

```text
.env.local
```

填入你自己的值：

```env
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3001
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

如果之后部署到正式域名，把 `NEXT_PUBLIC_APP_URL` 改成你的正式地址，例如：

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 4. 本地运行

```bash
npm install
npm run dev:local
```

打开：

```text
http://127.0.0.1:3001/login
```

## 5. 配置邮箱确认

当前项目使用的是 Supabase 官方推荐的 SSR 邮箱确认方式。

如果你直接使用 Supabase 默认模板，邮箱验证链接会把 session 放到 URL 片段里，服务端拿不到，结果就会跳到本项目的认证错误页。Supabase 官方文档也明确说明了这一点，并建议把模板改成 `token_hash` 直达你自己的服务端确认地址：

- [Next.js SSR 确认路由说明](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)
- [Email Templates 与 Redirect URLs 说明](https://supabase.com/docs/guides/auth/auth-email-templates)
- [redirectTo 与 Redirect URLs 说明](https://supabase.com/docs/guides/auth/redirect-urls)

请在 Supabase 后台完成这两步：

1. `Authentication` → `URL Configuration`
2. 设置：

```text
Site URL
http://127.0.0.1:3001
```

```text
Redirect URLs
http://127.0.0.1:3001/**
```

然后继续：

1. `Authentication` → `Email Templates`
2. 打开 `Confirm signup`
3. 把原来的 `{{ .ConfirmationURL }}` 链接替换成：

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">确认邮箱</a>
```

如果你以后部署到正式域名，再把这里的地址改成你的正式网址，并把正式域名加入 Redirect URLs。

## 6. 注册或登录

当前系统支持：

- 邮箱注册
- 邮箱密码登录

你可以：

1. 在第一台电脑先注册一个账号
2. 用同一个账号在第二台电脑登录
3. 两台电脑开始共用同一份学习数据

如果你的 Supabase 项目开启了邮箱确认，需要先去邮箱完成验证。

## 7. 现在已经共享的数据

当前版本已经同步到 Supabase 的内容包括：

- 考试倒计时
- 课程目录与课程状态
- 资料目录
- 每日待办
- 学习时长
- 打卡日期
- 刷题记录
- 模考记录
- 学习流水记录
- 错题截图与错题元数据

## 8. 当前行为说明

当前同步方式是：

- 保存/修改后写入云端
- 另一台设备刷新页面后即可读取最新数据

也就是说，现在重点是“跨设备共享”，不是“毫秒级实时协同”。

如果以后你希望：

- A 电脑改完，B 电脑不刷新也立即变化

那下一步可以再接入 Supabase Realtime。

## 9. 部署到公网

如果你要把它部署成正式网站，推荐两种组合：

- `Supabase + Railway`
- `Supabase + 自己的 VPS`

当前项目已经带有：

- `Dockerfile`
- `docker-compose.yml`

部署后只需要把生产环境里的 `.env.local` 或平台环境变量补齐即可。

## 10. 你后续最常做的事

后续你基本只需要记住三件事：

1. Supabase 的 SQL 只要初始化一次
2. 新环境只要补 `.env.local`
3. 两台电脑使用同一个账号登录即可共享数据
