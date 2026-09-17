# AGENTS.md

> 本文件供 AI 编码 Agent 阅读，描述仓库结构、技术约定与验证方式。
> 修改本文件需同步更新相关代码描述。

## 项目概述

沸点火锅点单与门店履约概念演示应用（`hdl-order-demo`）。React SPA，所有业务逻辑在浏览器中运行，不依赖后端 API。服务端（`server/`）仅为可选的健康检查 Express 应用，不参与核心业务链路。

用户主流程视图状态机：`bind → welcome → menu → order → checkout`

## 目录结构

```
src/
├── main.tsx              # 应用入口，挂载 React
├── App.tsx               # 根组件：状态管理（useReducer）+ 视图路由 + 全局布局
├── types.ts              # 类型定义：AppState, AppAction, Product, CartItem, OrderItem, ServiceRequest
├── i18n.ts               # i18next 初始化 + 中英文资源对象（zh / en）
├── index.css            # 全局样式：基础样式、老人模式、过渡动画、自定义 utilities
├── state/orderReducer.ts # 全局状态 reducer（订单/购物车/服务/售罄/支付）
├── data/menu.ts          # 菜品/分类/桌台静态数据
├── hooks/
│   └── useElderlyMode.ts # 老人模式 hook：localStorage + html.elderly class
├── lib/utils.ts          # 工具函数：cn（类名合并）、money（¥ 金额格式化）
├── components/
│   ├── BindTable.tsx     # 绑定餐桌视图
│   ├── WelcomeView.tsx   # 欢迎页视图
│   ├── MenuView.tsx      # 菜单点餐视图（含规格弹窗、超级辣风险提示）
│   ├── CartPanel.tsx     # 购物车面板（桌面端侧栏 + 移动端弹窗）
│   ├── OrderView.tsx    # 订单履约视图
│   ├── CheckoutView.tsx # 结账支付视图
│   ├── ServiceSheet.tsx # 桌边服务呼叫面板
│   ├── DemoConsole.tsx  # 演示控制台（手动切换状态）
│   ├── TopBar.tsx       # 顶部导航栏（含会员弹窗、语言/老人模式切换）
│   └── ui/
│       ├── button.tsx   # Button 组件（CVA 4 变体：default/secondary/outline/ghost）
│       └── dialog.tsx   # Dialog 组件（Radix UI 封装）
└── assets/              # 图片资源（hotpot.jpg, broth.jpg, beef.jpg, vegetables.jpg）

e2e/                     # Playwright E2E 测试
└── super-spicy.spec.ts  # 超级辣风险提示验收

index.html               # HTML 入口（含初始化语言的内联脚本）
tailwind.config.js       # Tailwind 配置（自定义色板）
postcss.config.js        # PostCSS 配置（tailwindcss + autoprefixer）
vite.config.ts           # Vite 配置（base: './'，alias '@' → src/）
playwright.config.ts     # Playwright 配置
```

## 技术栈

- **框架**：React 18 + TypeScript ~5.6 + Vite 6
- **样式**：Tailwind CSS 3.4（单一浅色主题，无暗色模式）
- **UI 库**：Radix UI（Dialog）、lucide-react（图标）、class-variance-authority（Button 变体）
- **国际化**：i18next + react-i18next（中/英双语）
- **E2E 测试**：Playwright
- **状态管理**：useReducer（内存态，无后端）
- **模块系统**：ESM（`"type": "module"`）
- **路径别名**：`@` → `src/`

## 样式约定

### Tailwind 自定义色板

定义在 `tailwind.config.js` 的 `theme.extend.colors`：

| 色系 | 色阶 | 十六进制 | 用途 |
| --- | --- | --- | --- |
| rice（暖白/米色） | 50 / 100 / 200 | #fffdf8 / #fbf5ea / #f3e6d0 | 背景、卡片、次级面板 |
| charcoal（深灰/文本） | 500 / 700 / 900 | #5f5b55 / #34312d / #211f1c | 文字、深色背景 |
| chili（红色/品牌） | 50 / 100 / 500 / 600 / 700 | #fff1ef / #ffddd8 / #e13b2b / #c92f21 / #a9231a | 按钮、强调、徽章 |
| amber（黄色/次强调） | 100 / 400 / 500 | #fff2c7 / #f5b83f / #e69b18 | 徽章、标记、进度色 |

### 颜色使用模式

- 颜色类名**直接硬编码在组件 JSX** 中（如 `bg-rice-100`、`text-charcoal-900`、`border-charcoal-900/5`），未使用 CSS 变量或语义 token 层。
- 新增组件时沿用同样的 Tailwind 类名直写模式，不引入 CSS 变量抽象层。
- 当前为单一浅色主题，Tailwind 未配置 `darkMode`，组件中没有 `dark:` 变体。

### 全局过渡

定义在 `src/index.css`：

```css
html { transition: background-color 250ms ease, color 250ms ease, font-size 250ms ease; }
html * { transition-property: background-color, border-color, color, fill, stroke, font-size; transition-duration: 250ms; transition-timing-function: ease; }
```

颜色与字号变化自动获得 250ms 过渡，老人模式切换无需额外处理动画。

## 功能扩展约定

### 新增 Hook

参照 `useElderlyMode.ts` 模式：

```typescript
export function useXxx() {
  const [state, setState] = useState(() => {
    const initial = getInitial()   // 从 localStorage 读取
    applyXxx(initial)               // 操作 document.documentElement.classList
    return initial
  })
  useEffect(() => { applyXxx(state) }, [state])
  const toggle = useCallback(() => {
    setState((prev) => {
      const next = !prev
      try { localStorage.setItem(KEY, ...) } catch { /* 降级为内存态 */ }
      return next
    })
  }, [])
  return { state, toggle }
}
```

### 新增 i18n 文案

在 `src/i18n.ts` 的 `resources` 对象中，`zh.translation` 和 `en.translation` 对应位置同步添加 key-value。命名空间按功能分组（如 `common.`、`menu.`、`cart.`、`order.`）。

### 新增 localStorage 持久化功能

- 统一使用 `try/catch` 包裹 `localStorage.getItem` / `setItem`，不可用时降级为内存态，不报错不阻塞。
- 现有 localStorage key：`i18nextLng`（语言）、`elderly-mode`（老人模式，值为 `true`/`false`）。

### 新增挂载前初始化逻辑

在 `index.html` 的 `<script>` 块中扩展，参考现有 i18n lang 设置逻辑，在 React 挂载前完成 html 属性或 class 设置。

### 新增组件

- 页面级组件放在 `src/components/`，通用 UI 组件放在 `src/components/ui/`。
- 组件使用 Tailwind 类名直写样式，不使用 CSS Modules 或 styled-components。
- 颜色使用上述色板，仅需浅色样式。
- 弹窗使用 `src/components/ui/dialog.tsx` 封装的 `Dialog` / `DialogContent`。
- 按钮使用 `src/components/ui/button.tsx` 封装的 `Button` 组件，选择合适的 variant。
- 图标使用 `lucide-react`，颜色通过 `currentColor` 继承。

## 验证命令

| 命令 | 作用 | 备注 |
| --- | --- | --- |
| `npm install` | 安装依赖 | 首次需要，后续可跳过 |
| `npm run build` | 编译 + 构建（`tsc -b && vite build`） | 产物输出到 `dist/` |
| `npm run lint` | ESLint 检查（`eslint . --ext ts,tsx --max-warnings 0`） | 零警告通过 |
| `npx tsc -b --noEmit` | 仅 TypeScript 类型检查 | 不产出文件 |
| `npx vite build` | 仅 Vite 构建（跳过 tsc） | 快速验证构建 |
| `npx playwright test` | E2E 测试 | 已配置 webServer 自动拉起 `npm run dev` |

## 测试约定

- E2E 测试在 `e2e/` 目录，使用 Playwright，当前用例文件为 `super-spicy.spec.ts`（超级辣风险提示验收）。
- 浏览器路径、reporter、视口、超时、webServer 等执行约定见下文「执行效率要求」；用例写法与提交前自审见「测试与 Review 引导」。

## 执行效率要求

### 1. 环境与依赖前置
- 检查 `node_modules` 是否存在，不存在时先执行依赖安装（`npm install` / `yarn` / `pnpm install`），再做编译 / 类型检查，避免因依赖缺失而回退。
- 在编码阶段的代码审查中，一并检查测试框架配置文件（如 `playwright.config.ts`）中已配置的 `reporter`、默认视口尺寸、超时时间、浏览器路径和 `webServer` 设置；后续执行测试时不传 `--reporter`、`--viewport` 等覆盖参数，直接使用默认配置，以一次执行同时获得控制台输出和 HTML 报告。
- 本仓库 `playwright.config.ts` 的既定默认值（不要在命令行覆盖）：`reporter` 为 `html` + `list`；HTML 报告实际输出到默认的 `playwright-report/`（配置里的 `outputDir: 'e2e-report/html'` 在当前 Playwright 1.62.1 实测不生效，仍落到 `playwright-report/`，找报告以实际目录为准）；视口为 Desktop Chrome 1280x720；`timeout` 30s、`expect.timeout` 10s；浏览器取 `PLAYWRIGHT_CHROMIUM_PATH` 或回退 `/opt/chromium.org/chromium/chrome`；`webServer` 自动执行 `npm run dev` 并探测 `http://localhost:5173`，本地已在跑时复用。
- **禁止执行 `npx playwright install chromium`（或 `playwright install` / `--with-deps`）下载浏览器**：浏览器由运行环境预装，配置已通过 `executablePath` 指定系统 Chromium，直接运行 `npx playwright test` 即可。若报“浏览器不存在”，不要下载，先确认系统 Chrome 路径（常见 `/usr/bin/google-chrome`、`/opt/chromium.org/chromium/chrome`），再用 `PLAYWRIGHT_CHROMIUM_PATH=<chrome 路径> npx playwright test` 临时指定；该路径问题属环境配置，不通过安装浏览器解决。

### 2. 断言编写预防清单
编写 E2E 测试用例时，在编码阶段提前检查并规避以下三类高频运行时问题，减少执行阶段才发现的修复往返：
- **CSS 过渡 / 动画时序**：若全局 CSS 或组件样式包含 `transition`（本仓库全局为 250ms，见 `src/index.css`），断言 `computed style` 前需等待至少 `transition-duration + 100ms`；断言 class 或可见性则优先用自动等待，避免依赖过渡时长。
- **响应式断点**：带 `lg:hidden` / `md:flex` 等响应式类的元素，需确认在默认 1280x720 视口下该元素可见；移动端底部导航（`lg:hidden`）在该视口下隐藏，桌面导航（`md:flex`）可见。需要验证移动端布局时在测试中显式 `setViewportSize` 到断点以下（如 390x844）。
- **异步渲染**：动态加载内容使用 Playwright 自动等待（`toBeVisible` / `toBeAttached` 等），而非固定 `sleep`。

### 3. 测试执行与修复策略
- 首轮执行全部受影响用例后，收集所有失败用例一次性批量修复，不逐个修复逐个重跑。
- **本轮受影响的多个 spec 文件必须在单次 `npx playwright test` 命令中一起执行**（如 `npx playwright test e2e/super-spicy.spec.ts e2e/other.spec.ts`），禁止逐个文件分多次执行，避免重复启动 webServer 和浏览器。
- 修复后使用 `--grep` / `-g` 只重新执行失败的用例验证；通过后再执行一次全量确认。
- 全量确认通过后直接上传报告，不再重复执行。
- **禁止为生成或定位 HTML 报告而重跑测试**；报告路径以 Section 1 既定默认值（`playwright-report/`）为准，若预期路径不存在，先检查 `playwright-report/` 等实际候选路径，确认报告确实缺失后才考虑重跑，并在交付说明中写明原因。
- 优先运行受影响范围：改单个 spec 用 `npx playwright test <spec 文件>`；只跑某条用例配合 `-g`；不必每次全量。

### 4. 代码审查效率
- 首轮用 `rg --files` + `rg -n` 批量定位全部相关文件（源码、测试、配置），将无依赖的文件读取合并为单次多文件并行调用，减少串行往返轮次。

### 5. 大文件与报告产物读取
- 禁止 `cat` / `head` 直接读取大体量或内嵌资源的产物：`playwright-report/index.html` 等 Playwright HTML 报告内嵌 base64 截图/视频，即使 `head -100` 也可能产生 10 万级 token 并被截断；`node_modules/`、`dist/assets/`、`*.jpg`、`*.webm`、`*.zip` 同样不要直接读入上下文。
- 判定测试结果优先看 `list` reporter 的终端输出（用例名 + 通过/失败），不解析 HTML 报告。
- **PASS/FAIL 判定以终端输出为准，不依赖 HTML 报告是否存在**；HTML 报告仅用于上传共享和人工复核，报告文件定位失败不影响结论，也不构成重跑理由。
- 需要从 HTML/JSON 产物提取结构化信息时，用 `rg -n` 定位或写脚本（`node -e` / `python3`）解析后只输出摘要字段；截图与录屏通过 Playwright 报告或 trace viewer 查看，不读取原始字节。
- 构建/部署日志只取关键段：用 `rg -n -C` 过滤 `error|failed|exit code`，不整段拉取。

### 6. 并行执行与只读检查
- 无数据依赖的只读命令必须合并到同一轮并行调用；有依赖时才串行。
- 典型并行分组：
  - 改动盘点：`git status -sb` + `git log --oneline -5` + `rg -n <关键词>` + 读取配置文件。
  - 发布检查：查询最新 workflow run + 查询 Pages 站点 HTTP 状态 + 确认本地 `origin/main` SHA。
- 轮询等待外部状态（CI/部署）时设置上限与固定间隔（如每 30s、最多 5 分钟），命中终态（success/failure/cancelled）立即停止，不空转重试。

## 测试与 Review 引导

### E2E 用例编写规范
- 用例按需求编号命名（如 `REQ-001` / `NFR-001`），`test.describe` 描述被测功能域，单个用例只验证一个验收点。
- 复用页面导航辅助函数（参考 `goToBrothSpec`），把跨视图的重复点击步骤收敛为函数，用例体内只保留与断言相关的操作。
- 定位元素优先级：`getByRole`（带可访问名）> `getByText` / `getByLabel` > 语义 locator（`article`、`heading`）> 兜底 CSS；避免依赖易变的 DOM 层级或 nth 结构，确需取第 N 个时显式注释原因。
- 断言业务结果而非实现细节：优先断言可见文案、Tailwind 业务 class（如 `border-chili-500`）和元素可见性，不断言内部状态字段。
- 每个用例独立、可乱序执行，不依赖其它用例写入的状态（本应用状态为内存态，刷新即重置）。
- 交互后用 `expect(...).toBeVisible()` / `not.toBeVisible()` 做同步，不使用 `waitForTimeout` 固定等待；点击会被遮罩拦截时可 `force: true` 并注释说明这是设计行为。

### 变更自审清单（提交前）
- 改动是否覆盖需求的正反两类路径（如超级辣弹提示、其它辣度不弹）。
- 是否破坏既有基于 class / 文案的 E2E 断言；改样式或文案时同步评估 `e2e/` 用例。
- 中英文文案（`src/i18n.ts` 的 zh / en）是否都已更新；新增 localStorage key 是否遵循 try/catch 降级约定。
- 是否引入后端调用或新 UI 库等“不要做”中禁止的内容。
- 是否需要更新本文件的目录结构、色板或约定描述。

### 验证选择
- 类型 / 构建问题：先 `npm run build` 或 `npx tsc -b --noEmit`。
- 样式与静态规范：`npm run lint`。
- 交互回归：`npx playwright test`（自动拉起 dev，使用默认 reporter 与视口，不额外传覆盖参数）。
- 三类验证各自独立报错，按报错来源选择对应命令，不用构建命令排查 E2E 行为问题。

## 发布上线（GitHub Pages）

职责边界：本环节只核验“构建部署是否成功、站点是否可访问”，不重复执行 lint/build/E2E 全量验收；那些结论已在上游环节取得，此处直接采信其结果。

仓库事实（来自 `.github/workflows/deploy-pages.yml`、`vite.config.ts`）：
- 工作流名 `Deploy GitHub Pages`（文件 `deploy-pages.yml`），push 到 `main` 触发；只执行 `npm ci` + `npm run build` 后上传 `dist`，不在 CI 跑 E2E。
- 项目级 Pages 站点：`https://<owner>.github.io/<repo>/`（Vite `base: './'`，资源为相对路径）。

验证步骤（API 为公开仓库只读查询，未鉴权即可；`<owner>`/`<repo>` 用实际仓库归属和名称替换）：

1. 确认触发提交已在 `origin/main`：`git fetch origin main --quiet && git log --oneline origin/main -3`。
2. 查询 `main` 最新部署 run（与第 1 步、第 4 步可并行）：
   ```bash
   curl -fsSL "https://api.github.com/repos/<owner>/<repo>/actions/workflows/deploy-pages.yml/runs?branch=main&per_page=1" \
     | jq '.workflow_runs[0] | {id, status, conclusion, head_sha, html_url}'
   ```
   判定：`status=completed` 且 `conclusion=success` 即成功；`queued/in_progress` 则每 30s 轮询、上限 5 分钟；`conclusion` 为 `failure/cancelled` 即失败。
3. 失败时只拉关键日志定位，再查失败 job：
   ```bash
   curl -fsSL "https://api.github.com/repos/<owner>/<repo>/actions/runs/<run_id>/jobs" \
     | jq -r '.jobs[] | select(.conclusion!="success") | .name, (.steps[]|select(.conclusion=="failure")|.name)'
   ```
4. 成功后验证站点可访问（与第 2 步并行发起）：`curl -fsSI "https://<owner>.github.io/<repo>/" | head -5`，期望 `HTTP/2 200`；CDN 刚部署可能短暂 404，可间隔重试 2-3 次。
5. 可选功能上线确认：从首页 HTML 取 JS 资源名后 `curl -fsSL <js 地址> | rg -o "沸点|超级辣" | head`，确认线上包含关键功能标记，不下载整包到上下文。

完成条件：workflow run `completed/success` 且 Pages URL 返回 200，输出可访问链接；失败或超时则记录 run 链接、失败 job/步骤与处理建议。

## 不要做

- 不引入额外的 UI 库或设计系统框架。
- 不使用 CSS Modules 或 styled-components，统一 Tailwind 类名。
- 不修改 `server/` 目录（仅用于演示健康检查，无业务逻辑）。
- 不引入后端 API 调用，所有数据为前端内存态。
