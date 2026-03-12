# 公考管理系统

基于 Next.js 构建的个人公考学习驾驶舱，用于统一管理：

- 课程结构
- 学习记录
- 考试倒计时
- 学习节奏与阶段复盘

当前版本先实现了网页端 MVP 骨架，重点是把高频动作放到同一个工作界面里，而不是继续分散在网盘、备忘录和表格中。

## 当前已实现

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

## 使用要求

- 操作系统：
  推荐 `Windows 10 / 11`
- 运行环境：
  需要先安装 `Node.js`
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

### Windows 一键启动

Windows 下推荐直接双击项目根目录的 `start-gongkao-manager.bat`。

这个脚本会自动：

- 检查依赖是否存在
- 在缺少依赖时自动执行 `npm install`
- 自动构建最新版本
- 启动本地网页服务
- 自动打开浏览器到 `http://127.0.0.1:3001/`

也就是说，你以后改完代码后，不需要再手动执行 `npm run build` 和 `npm run start`，直接再次双击这个脚本即可。

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

生产模式预览：

```bash
npm install
npm run build
npm run start:local
```

## 启动脚本说明

- `start-gongkao-manager.bat`
  推荐日常使用，每次都会自动构建最新版本后再启动
- `start-gongkao-manager-prod.bat`
  用于预览当前已有构建；如果本地还没有构建产物，会先构建一次

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

- 课程与记录仍使用示例数据，尚未接数据库
- 夸克链接目前是占位入口，后续替换为真实分享链接
- 公考信息更新区仅预留版位，暂未接爬虫或资讯聚合
- 倒计时设置目前保存在浏览器本地存储中

## 下一步建议

1. 接入 SQLite / Prisma，替换掉当前示例数据
2. 实现课程、记录、倒计时的真实增删改查
3. 接入夸克真实分享链接
4. 增加统计页、复盘页和后续资讯模块
