# 公考管理系统

基于 Next.js 构建的个人公考学习驾驶舱，用于统一管理：

- 课程结构
- 学习记录
- 考试倒计时
- 学习节奏与阶段复盘

当前版本先实现了网页端 MVP 骨架，重点是把高频动作放到同一个工作界面里，而不是继续分散在网盘、备忘录和表格中。

## 当前已实现

- `账号登录与跨设备共享`
  支持同一账号在两台电脑登录，并共享课程状态、打卡、学习记录、刷题记录、模考成绩、待办和错题本

- `首页仪表盘`
  显示今日学习重点、科目推进、考试倒计时、公考信息预留位

- `课程中心`
  按科目 / 模块 / 课时展示课程，并预留夸克链接入口

- `学习记录页`
  展示最近学习流水、本周复盘和记录模板

- `倒计时设置页`
  支持本地维护国考、省考、事业编等考试节点，修改后首页与侧栏同步更新

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth / Database / Storage

## 使用要求

- 操作系统：
  推荐 `Windows 10 / 11`
- 运行环境：
  需要先安装 `Node.js`
- 共享数据：
  需要准备一个 `Supabase` 项目，并执行一次初始化 SQL
- PDF 导出：
  如果要使用错题本 PDF 导出功能，还需要安装 `Python 3`，并执行 `pip install -r requirements.txt`
- 包管理器：
  需要可用的 `npm`
- 网络：
  首次启动如果本地还没有安装依赖，需要联网下载依赖包

建议安装 `Node.js 20+`。

## 克隆后如何运行

先克隆项目：

```bash
git clone git@github.com:lory-cliver-hh/Public-Examination-Management-Station.git
cd Public-Examination-Management-Station
```

然后先完成一次 Supabase 初始化：

1. 复制 `.env.example` 为 `.env.local`
2. 填写 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. 在 Supabase SQL Editor 中执行 [supabase/init.sql](supabase/init.sql)
4. 在 Supabase `Authentication` → `URL Configuration` 中加入：
   `Site URL = http://127.0.0.1:3001`
   `Redirect URLs = http://127.0.0.1:3001/**`
5. 在 Supabase `Authentication` → `Email Templates` → `Confirm signup` 中，把确认链接改成：

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">确认邮箱</a>
```

6. 参考 [docs/Supabase初始化与共享数据.md](docs/Supabase初始化与共享数据.md)

### Windows 一键启动

Windows 下推荐直接双击项目根目录的 `start-gongkao-manager.bat`。

这个脚本会自动：

- 检查依赖是否存在
- 在缺少依赖时自动执行 `npm install`
- 自动构建最新版本
- 启动本地网页服务
- 自动打开浏览器到 `http://127.0.0.1:3001/`

也就是说，你以后改完代码后，不需要再手动执行 `npm run build` 和 `npm run start`，直接再次双击这个脚本即可。

如果你希望同一局域网内的另一台电脑也能访问，请双击：

```text
start-gongkao-manager-lan.bat
```

这个脚本会让服务监听 `0.0.0.0`，并在终端里打印可访问的局域网地址。

### 手动启动

如果不想双击脚本，也可以手动运行。

开发模式：

```bash
npm install
npm run dev:local
```

然后打开：

```text
http://127.0.0.1:3001/
```

局域网调试模式：

```bash
npm install
npm run dev:network
```

生产模式局域网访问：

```bash
npm install
npm run build
npm run start:network
```

生产模式预览：

```bash
npm install
npm run build
npm run start:local
```

## 启动脚本说明

- `start-gongkao-manager.bat`
  推荐日常使用，每次都会自动构建最新版本后再启动
- `start-gongkao-manager-lan.bat`
  局域网共享访问，适合同一网络内其他电脑打开

## 登录与共享

当前版本已经支持：

- 两台电脑登录同一个账号
- 共享课程状态、待办、打卡、学习记录、刷题记录、模考成绩、倒计时
- 共享错题本截图和错题记录

使用方式很简单：

1. 第一台电脑先注册一个邮箱账号
2. 第二台电脑用同一个邮箱账号登录
3. 两台电脑刷新后看到同一份数据

## 别人克隆后是否可以直接运行

可以，但前提是：

- 对方电脑已经安装 `Node.js` 和 `npm`
- 首次安装依赖时网络可用
- 使用的是 `Windows` 时，建议直接双击 `start-gongkao-manager.bat`

也就是说，这个项目现在是：

- 可以“一键启动”的网页项目
- 不是“完全免环境”的独立 `.exe` 程序

## 已验证

当前已验证以下命令可通过：

```bash
npm run lint
npm run build
```

## 目录说明

```text
docs/                         需求文档
src/app/                      页面路由
src/components/               布局与交互组件
src/lib/mock-data.ts          当前示例数据
```

## 常见问题

### 1. 双击脚本没反应

优先检查：

- 是否安装了 `Node.js`
- 在终端里执行 `node -v` 和 `npm -v` 是否有输出

### 2. 首次启动很慢

首次启动如果本地没有 `node_modules`，脚本会自动执行 `npm install`，这是正常现象。

### 3. 启动后网页打不开

可以手动执行：

```bash
npm install
npm run dev:local
```

然后访问：

```text
http://127.0.0.1:3001/
```

### 4. 关闭黑色终端窗口后网页打不开

启动脚本拉起的服务依赖那个终端窗口运行，关闭后服务会停止。重新双击脚本即可再次打开。

## 当前约束

- 夸克链接目前是占位入口，后续替换为真实分享链接
- 公考信息更新区仅预留版位，暂未接爬虫或资讯聚合
- 当前重点是“跨设备共享”，还没有接入 `Supabase Realtime` 做无刷新实时协同
- 如果两台电脑同时打开页面，一台修改后，另一台通常需要刷新页面才能读到最新内容

## 部署与异机访问

已经补充：

- `Dockerfile`
- `docker-compose.yml`
- [docs/部署与异机访问.md](docs/部署与异机访问.md)
- [docs/Supabase初始化与共享数据.md](docs/Supabase初始化与共享数据.md)

如果你的目标是：

- `同一局域网另一台电脑打开`
  优先使用 `start-gongkao-manager-lan.bat`
- `把项目放到云服务器并发布成网站`
  优先使用 `docker compose up -d --build`
- `多台电脑共享同一份学习数据`
  当前版本已经支持，但前提是先完成 Supabase 初始化

## 下一步建议

1. 接入 `Supabase Realtime`，让两台电脑无需刷新也能即时同步
2. 接入夸克真实分享链接
3. 增加统计页、复盘页和后续资讯模块
4. 增加更细的账号管理和备份能力
