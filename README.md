[English](docs/README.en.md) | **简体中文**

> 本文件是中文版；英文版在 [`docs/README.en.md`](docs/README.en.md)。`docs/` 下的文档目前除
> [`docs/theming.md`](docs/theming.md)（中文）外都是英文。

# Jin · 锦

面向桌面应用、以令牌驱动的 Vue 3 控件库。

**名字的含义。** 锦是提花织物：由许多重复的小单元织成，可染成多种配色。这正是本库的形状——
组件是重复单元，主题是配色。它是中文词，读作 `jin`，不是它的日文读音。

---

## 这个库建立在两个想法之上

**1. 令牌是库与应用之间唯一的接口。** 主题设置的不只是颜色。它同时声明形状、深度、质感、动效、
字体与密度——因为这个库要支持的风格，在*形制*上的差异远大于在色相上的差异：一种有 20px 圆角和
弹性动效，另一种是直角、完全没有动画。80 个契约令牌全部列在
[`contracts/tokens.json`](contracts/tokens.json)，每个主题文件都完整定义这 80 个。

**2. 逻辑与渲染分离。** 每一个状态机——锚定定位、焦点陷阱与焦点归还、roving tabindex 导航、菜单
与树导航、热键录制、浮层栈、toast 队列——都在 `src/core/` 下用纯 TypeScript 实现。它们没有一个
import Vue，全部可以在没有浏览器的情况下单元测试。组件只负责渲染和绑定事件。这正是行为能在多个
应用之间共享、而不是每个控件各写一遍的原因。

---

## 安装

```bash
npm install /path/to/jin                  # 本机的一个 checkout
npm install ./bythid-jin-0.1.0.tgz        # `npm pack` 出来的 tarball
# 尚未发布到 registry。发布后是 `npm install @bythid/jin`；
# 为什么是 scoped 包名见「打包」一节。
```

`vue` 是 **peer 依赖**：本库从不自带一份自己的 Vue。

三行 import，都写在入口文件里：

```ts
import { JinUI } from '@bythid/jin'              // 插件，以及你要用的组件
import '@bythid/jin/styles.css'                  // 基础样式表 —— 必需
import '@bythid/jin/themes/jin.css'              // 一个风格（jin 是默认风格）
import '@bythid/jin/themes/jin.dark.css'         // 以及它的模式
```

基础样式表由应用自己写下 import，而不是插件自动引入，这是刻意的。从依赖内部 import 进来的样式表
可能被使用方的打包器丢掉——而且是静默的：控件照常渲染，哪里都不会报错——所以它必须是应用自己写的、
丢不掉的那一行 import。启动时如果它没加载，插件会带上名字提示一次。

### 同时开发库和应用

`file:` 依赖直接读库的源码，改完立刻可见，不需要重新构建：

```jsonc
// 使用方应用的 package.json
{
  "dependencies": { "@bythid/jin": "file:../jin" }    // 或一个 npm workspace 条目
}
```

```ts
// vite.config.ts
export default defineConfig({
  resolve: {
    // 读库的 `source` 入口，而不是构建产物。
    conditions: ['source'],
    // 少了这一行，被链接的库会带进第二份 Vue，而症状是响应式静默失效，
    // 不是报错。
    dedupe: ['vue'],
  },
  server: {
    // 库在应用根目录之外，dev server 需要被允许读它。
    fs: { allow: ['..'] },
  },
})
```

```jsonc
// tsconfig.json —— 同一个条件，给类型检查器用
{
  "compilerOptions": { "customConditions": ["source"] }
}
```

一共两行，一个工具一行：`resolve.conditions` 决定打包器运行什么，`customConditions` 决定编辑器和
`vue-tsc` 读什么。少了后面那一条，类型来自 `dist/index.d.ts`，永远落后你正在编辑的源码一个构建。

在库目录里跑 `pnpm install` 会构建 `dist/`（它的 `prepare` 脚本），所以不启用 `source` 条件也能
解析——那条路径读的是构建后的 ESM 与声明文件，也就是 tarball 或从 registry 安装时拿到的东西。
两条路径都有机械验证：Gallery 以 source 模式构建并做类型检查；`pnpm run smoke` 则打包本库、把
tarball 装进一个临时项目、对 `dist/` 构建它，并断言样式表与契约文件到位、随包发布的声明文件能通过
类型检查。[`docs/consuming.md`](docs/consuming.md)（英文）是长文，包括弄错时的症状。

---

## 使用

```ts
// main.ts
import { createApp } from 'vue'
import { JinUI } from '@bythid/jin'
import '@bythid/jin/styles.css'
import '@bythid/jin/themes/jin.css'
import '@bythid/jin/themes/jin.dark.css'
import App from './App.vue'

createApp(App)
  .use(JinUI, {
    // 三项都是可选的：只写 `app.use(JinUI)` 也是一次合法的安装。
    t: (key, vars) => i18n.t(key, vars),
    capabilities: {
      pickFolder: async () => '/some/path',
      openExternal: async (url) => { /* … */ },
    },
    theme: {
      onChange: (snapshot) => localStorage.setItem('theme', JSON.stringify(snapshot)),
    },
  })
  .mount('#app')
```

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { JinButton, JinTree, type TreeNode } from '@bythid/jin'

const nodes = ref<TreeNode[]>([{ id: 'a', label: 'Alpha', hasChildren: true }])

async function loadChildren(node: TreeNode): Promise<TreeNode[]> {
  const response = await fetch(`/api/children/${node.id}`)
  if (!response.ok) throw new Error(`Server said ${response.status}`)
  return response.json()
}
</script>

<template>
  <JinButton variant="primary" @click="save">Save</JinButton>

  <JinTree :nodes="nodes" :load="loadChildren" @load-error="rollback" />
</template>
```

### 三个注入点

| 选项 | 作用 | 省略时 |
| --- | --- | --- |
| `t` | 翻译本库的 UI 文案 | 使用本库可读的英文默认值 |
| `capabilities` | 提供 `pickFolder` / `openExternal` / 剪贴板能力 | 需要它们的控件会隐藏入口，而不是失败 |
| `theme` | 持久化风格与模式；本库自己从不碰存储 | 风格与模式只在本次会话内有效 |

本库需要 25 条文案，声明在 [`contracts/strings.json`](contracts/strings.json)；没有任何一个 key
含业务词，因为本库没有业务词汇可翻。字典以源文本（比如中文）为 key 的应用，自己写一层映射——
那一层属于应用。

---

## 主题

两条正交的轴，作为属性设在 `<html>` 上：

```html
<html data-jin-style="jin" data-jin-mode="dark">
```

| | |
| --- | --- |
| `data-jin-style` | 视觉语言：`jin`（默认）加八个目录风格——见下表 |
| `data-jin-mode` | `dark`（Jin 的标志性模式「玄锦」）或 `light`（「素锦」）；每个风格两种都提供 |

每个主题文件命名为 `风格[.dark].css`，并且是**自洽**的：它重述整个契约，而不是依赖另一个风格残留
下来的值。所以换主题只是换一个文件——不需要做层叠考古。

随库发布九种风格，它们的选取标准就是彼此不同意：一种把深度放在弥散阴影里，下一种就放在硬偏移、
模糊、内阴影里，或者干脆完全不表达。

| 风格 | 圆角（sm / md / lg） | 深度 | 边框 | 动效（base） |
| --- | --- | --- | --- | --- |
| **Jin · 锦**（默认） | 6 / 8 / 12px | 弥散阴影 + 微浮雕 | 1px 金线 | 200ms |
| **极简 / 瑞士国际主义** | 0 | 无 | 1px 发丝线 | 250ms |
| **新拟态** | 10 / 14 / 18px | 明暗成对阴影 + 内阴影 | 1px，贴近表面 | 200ms |
| **玻璃拟态** | 8 / 14 / 18px | 弥散彩色阴影 | 1px 亮边 | 220ms |
| **黏土拟态** | 14 / 20 / 24px | 厚度偏移 + 柔和投影 + 内高光 | 3px，柔色 | 240ms，回弹 |
| **扁平设计** | 2 / 4 / 6px | 无，显式声明为 `none` | 1px 线 | 180ms |
| **新粗野主义** | 0 | 硬偏移，无模糊半径 | 3px 黑 | 150ms |
| **粗野主义** | 0 | 无 | 3px，始终可见 | 0s |
| **维度分层** | 6 / 10 / 14px | 四级阴影 | 1px 发丝线 | 200ms |

标题使用 `--jin-font-display`：在 Jin 里它是第二个声音（衬线 / 宋体），在其余风格里就是正文字族；
质感方面，经纬纹样是 Jin 的专属，另外八个都是 `none`。

Jin 是本库的自有风格与默认，以标志性的**深色**模式（玄锦）示人，另有浅色变体（素锦）。它的完整
规范在 [docs/theming.md](docs/theming.md)；每个风格的一句话身份写在 Gallery 的风格切换器里，任何
风格定义了哪些令牌可以在 Gallery 的令牌面板里实时浏览。

令牌名冻结在 `--jin-` 前缀上。它同时是 CSS 命名空间和组件命名空间，所以这不是以后可以改的东西。

### 这些风格从哪来

**Jin（锦）是原创设计**——本库自己的视觉身份，也是默认风格。

**其余风格是对
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
中条目的实现**（MIT，© 2024 Next Level Builder），那是一个可检索的 UI 风格目录。正是这个目录提出
了「令牌必须覆盖形状、深度与动效，而不只是颜色」这一要求，本库实现了其中八个条目：
`minimalism-and-swiss-style`、`neumorphism`、`glassmorphism`、`claymorphism`、`flat-design`、
`neubrutalism`、`brutalism` 与 `dimensional-layering`。它们是该目录的主流风格，也是它在自己的
产品与 UX 指引里引用最多的那些；[docs/theming.md](docs/theming.md) 第八节列出了它们，以及每个风格
各自压到的契约轴。

我们按本库的 80 令牌契约实现各风格的**特征**；没有复制该项目任何样式表，因为它提供的是设计指引而
不是 CSS。每个此类主题都在自己的文件头里署名来源。完整署名：[CREDITS.md](CREDITS.md)。

### 写一个主题

1. 从 `contracts/tokens.json` 复制令牌清单（或对半成品直接跑检查器）。
2. 在 `:root[data-jin-style='your-style']` 下定义**全部**令牌。
3. 跑 `pnpm run check`——令牌完整性由机械检查强制，不靠 review。
4. 把文件加进 Gallery 的 `main.ts`，它就成为可选项。
5. 跑 `pnpm run check:contrast`——一个次要文字落在 4.4:1 的主题看起来没问题，而它确实有问题。

`--jin-focus-ring-*` 值得单独说一句：它在每个主题里都显式声明，绝不由强调色推导。键盘焦点是硬
要求，否则某个恰好把强调色放在自身背景附近的风格会顺手把它抹掉。

---

## 盒子里有什么

**反馈** —— `JinSpinner` `JinProgress` `JinSkeleton` `JinAlert` `JinToastRegion`
`JinNotificationRegion` `JinResult`
**浮层** —— `JinModal` `JinDrawer` `JinPopover` `JinTooltip` `JinPopconfirm`
**表单** —— `JinField` `JinTextField` `JinSearchField` `JinSelect` `JinCheckbox`
`JinRadioGroup` `JinSwitch` `JinHotkeyRecorder`
**导航** —— `JinTabs` `JinMenu` `JinDropdown` `JinContextMenu` `JinBreadcrumb` `JinDivider`
`JinCard` `JinToolbar` `JinNav` `JinTree`
**数据** —— `JinBadge` `JinTag` `JinDetailList` `JinLink` `JinIcon`

刻意缺席的，以及原因：日期与时间选择器、颜色选择器、数据网格、虚拟列表、头像、轮播、滑块、评分和
产品引导。它们要么是一整个产品的工作量（日历），要么是 CSS 已经解决了的伪问题（`text`、`label`、
`link`），所以没有一个能从「被抽象成共享控件」里获益。

### toast 与 notification 的区别

它们看起来相似，但不可互换：

| | toast | notification |
| --- | --- | --- |
| 生命周期 | 到时自动消失 | 一直留在那里，直到被关闭 |
| 是否打断 | 从不——它不该要求回应 | 会；它就是用来承载决定的 |
| 用来放什么 | 确认「刚刚发生了什么」 | 用户必须处理的事 |
| 被忽略时 | 什么也没丢 | 稍后它还在那儿 |

两者跑在同一条队列上，所以淘汰规则很重要：当一个位置满了，被丢掉的是**最旧的 toast**，永远不是
notification。丢掉一条确认只是点小烦恼；丢掉一个用户还等着做的决定不是。

---

## 可访问性

不是事后补上的清单——它就是好几个模块存在的原因。

- 每个可交互控件都能用键盘到达，并有取自焦点令牌的可见焦点环。
- 浮层打开时锁定焦点，关闭时归还给打开它的元素——绝不归还到 `<body>`。
- 嵌套浮层逐个关闭：Escape 只到达栈顶那一层。
- 状态从不仅靠颜色传达。每个 tone 都配图标，每个要紧的取值同时以文字出现。
- `prefers-reduced-motion: reduce` 把所有动效令牌置为 `0s`，机械类动画（spinner、骨架屏扫光）被
  刻意豁免，因为冻住的 spinner 不再表示「正在工作」。
- 长列表与工具栏使用 roving tabindex：整组一个 tab 停留点，组内用方向键移动。

---

## 开发

```bash
pnpm install           # 同时构建 dist/（`prepare` 脚本）
pnpm run hooks         # 每个 clone 做一次：接上 git 钩子（pre-commit、commit-msg）
pnpm run test          # 纯逻辑测试 + 组件测试
pnpm run test:coverage # 同上，并对 src/core 设覆盖率下限
pnpm run check         # 六项纪律检查 + 对比度审计
pnpm run check:pack    # 对打包出的 tarball 跑 publint + arethetypeswrong
pnpm run typecheck
pnpm run verify        # 依次跑 check、test、typecheck 与 check:pack
pnpm run build         # dist/：ESM + 单文件 index.d.ts + source map
pnpm run smoke         # 打包本库，并对它构建一个消费者项目
```

两个 git 钩子把约定变成机械的：`pre-commit` 跑令牌检查，`commit-msg` 用 commitlint 校验
`type(scope): summary` 约定。它们在 `.husky/` 里，由 `pnpm run hooks` 接上——刻意不放进
`prepare`，因为库作为 git 依赖被安装时 `prepare` 也会执行，而往消费者的 checkout 里写 git 钩子
是错的。

### 打包

应用解析到什么，由 `package.json` 的 `exports` 决定，每个入口都有两个答案——构建产物，以及被链接
的 checkout 会要的 `source` 入口：

| 说明符 | 从 registry 安装 | `conditions: ['source']` |
| --- | --- | --- |
| `@bythid/jin` | `dist/jin.js` + `dist/index.d.ts` | `src/index.ts`——使用方 `tsconfig.json` 里加上 `customConditions: ['source']` 后，编辑器也会跟随 |
| `@bythid/jin/styles.css` | `src/styles/jin.css` | `src/styles/jin.css` |
| `@bythid/jin/themes/*.css` | `themes/*.css` | `themes/*.css` |
| `@bythid/jin/contracts/*.json` | `contracts/*.json` | `contracts/*.json` |

样式表按原样发布，而不是预先构建：使用方的打包器无论如何都会压缩它，而一个在两种模式下都相同的文件
不会与自己产生偏差。`npm pack` 包含 `dist/`（ESM、source map，以及打包成单文件的 `index.d.ts`
——api-extractor 把逐模块声明卷成一个文件，因为未打包的目录树里那些无扩展名相对导入无法通过
Node16 类型解析）、`src/`（样式表，以及 source map 指向的源文件）、`themes/`、`contracts/`、
README、署名、变更日志与许可证——97 个文件，打包后 258 kB（从 161 个文件降下来：逐模块声明树没有
了）。

`pnpm run check:pack` 审计发布面本身，并且是 `verify` 的一部分：publint 校验 `exports` 与
`files`，arethetypeswrong 对真实 tarball 在 node10、node16 与 bundler 三种解析模式下逐个入口做
类型解析。有一条规则被刻意忽略——`cjs-resolves-to-esm`：本包按设计只有 ESM，所以 `require()` 解析
到 ESM 是预期行为，不是缺陷。

### 发布

尚未发布：组件 API 仍在移动。今天的分发方式有三种——同一台机器上的 checkout、`npm pack` 的
tarball、以及一个 git tag——按便利程度从高到低，按健壮性从低到高。把 tarball 给别人：它带着
`dist/`，所以安装时没有构建步骤、没有生命周期脚本。git 依赖会在安装时由 `prepare` 构建，而
`ignore-scripts` 和脚本审批策略会把它关掉。

仓库只有一份，在 GitHub（`bythid/jin`），`origin` 指向它。CI、Dependabot 与发布都在那里，每次
push 和每个 pull request 都会执行 `pnpm run verify`（`.github/workflows/ci.yml`）。Issue 与 PR
也都在 GitHub——没有第二份副本需要同步。

发版流程与 [CHANGELOG.md](CHANGELOG.md) 描述的完全一致，顺序是：

1. **准备**：在 `main` 上一个提交，bump `package.json` 的 `version`，并在 CHANGELOG 的
   `[Unreleased]` 下写条目——条目写给"必须作出反应的使用方"，不是写给提交历史。
2. **推标签**：`git tag vX.Y.Z && git push origin vX.Y.Z`。标签触发
   `.github/workflows/publish.yml`，CI 先跑 `verify` 与 `smoke`（`prepublishOnly` 就是它们）。
3. **批准上线**：工作流用 npm trusted publishing（OIDC）把版本送进**待审队列**而不是直接上线——
   任何地方都不存 npm token，provenance 由 OIDC 令牌自动生成。由维护者在可信设备上批准：

   ```bash
   npm stage list @bythid/jin          # 找到 stage-id
   npm stage view <stage-id>           # 审内容
   npm stage approve <stage-id>        # 过一遍 2FA，版本才上线
   ```

   npmjs.com 的包页面上也能批准。这一步是刻意的：即使工作流里的某个 action 被投毒，它也只能把版本
   送进队列，碰不到使用者。

首次发布是唯一的例外，它手工执行以建立包和它的 scope，之后在 npmjs.com 上配置 trusted publisher
（本仓库、`publish.yml`，只允许分阶段发布）。`v0.1.0` 就是那一版手工发布的产物，因此不打标签；
标签驱动的发布从下一个版本开始。

发布工作流跑在 Node 22 上，而 Node 22 自带的 npm 是 10.9.x；trusted publishing 要求 npm CLI
≥ 11.5.1，分阶段发布要求 ≥ 11.15.0。所以 `publish.yml` 在装依赖之前显式装了一次 npm——少了那一步，
标签触发的发布会因为没有任何可用的认证渠道而失败。

包名在发布时已经定好：**`@bythid/jin`**。之所以是 scoped 的，是因为 npm 在字母表这一段已经没有
好名字了——`jin` 自 2012 年起被占，`jin-ui` 自 2022 年起被一个无关的 uni-app 组件库占用，而 npm
从不回收名字。`publishConfig.access` 是 `public`，因为 scoped 包默认私有，否则首次发布会被拒。

`npm publish` 会先重跑门禁——`prepublishOnly` 是 `pnpm run verify && pnpm run smoke`，`prepare`
构建 `dist/`——所以发布无法跳过它们。对这一节来说关键是冒烟测试：它打包本库，把 tarball 作为真实
目录解压进一个临时项目的 `node_modules`，并用一个对本 checkout 一无所知的配置构建那个项目。去掉
`./styles.css` 导出，或者把 `src` 从 `files` 里删掉，它就会带着原因失败。

### 启动 Gallery

```bash
python start_gallery.py              # dev server，自动打开浏览器
python start_gallery.py --tauri      # 桌面外壳
python start_gallery.py --build      # 生产构建，然后把它 serve 起来
python start_gallery.py --port 5300  # 换一个端口
python start_gallery.py --no-browser # 不打开窗口
```

`pnpm run gallery` / `gallery:tauri` / `gallery:build` 等价——它们调的是同一个脚本。

脚本启动前会检查前置条件（并说明缺的是哪一个），如果端口上已经有一个 Gallery 在跑就直接复用而不是
再起一个，如果端口被无关程序占着就顺延到下一个空闲端口，并且在 Ctrl+C 时杀掉**整棵进程树**。最后
一点比听起来重要：`npm` 生出 `node`，`node` 再生出 `vite`，只中断父进程会留下一个占着端口的孤儿，
下一次启动就会报「端口已被占用」。

### Gallery 是双语的

页头的切换器带三条轴——风格、模式与语言——语言那一条会翻译整个应用，包括本库自己的文案：`main.ts`
把 Gallery 的翻译函数传给 `app.use(JinUI, { t })`，也就是 [consuming.md](docs/consuming.md)
描述的集成路径。英文是源语言，会回落到本库可读的默认值，所以英文读者看到的与一个完全不传 `t` 的
消费者看到的完全一致；简体中文是那个做完整的示例，切过去之后，控件宣告的每一个「Close」、
「Expand all」、「No data」都会改变。

选择会持久化（`jin-gallery.locale`），首次访问跟随 `navigator.language`，`<html lang>` 也跟随
选择，字体栈与屏幕阅读器的发音随之改变。一切都在 `gallery/src/i18n/` 里：`locales/en.ts` 既是
英文文案也是 key 空间，`locales/zh.ts` 对它做类型约束——加了一个字符串却没加翻译会让 Gallery 的
类型检查失败——`library.ts` 覆盖 `contracts/strings.json` 声明的那些 key。加第三种语言是一个
文件，加 `LOCALES` 里的一条。

### 纪律检查

`tools/check_tokens.py` 强制那些 code review 可靠地漏掉的规则：

1. 每个主题文件定义每一个契约令牌；
2. 主题层之外没有硬编码的颜色、圆角、阴影、时长或字号；
3. 本库源码里没有业务词汇；
4. 没有库文件 import 应用代码；
5. `jin-` 类名、`Jin*` 组件、`data-jin-*` 属性，且没有全局元素选择器；
6. 插件读取的样式表标记与 `src/styles/jin.css` 实际声明的一致——一份两个文件各自都说不全的契约。

`tools/check_contrast.py` 单独测量每个主题的文字与焦点颜色，对比它们实际所在的表面，低于 4.5:1
（正文）或 3:1（焦点环）就失败。它先把半透明色合成到真实背景上，因为拿原始 `rgba()` 三元组去比会
报出并不存在的失败——同时漏掉真实存在的那些。

检查 3 的词汇表可以由使用方自己补充：复制模板即可，这份副本被 gitignore，不会随库发布。

```bash
cp tools/check_tokens.local.json.example tools/check_tokens.local.json
# 然后加入你自己应用的名词
```

没有它，通用检查照样运行，新 clone 的行为与有它时一致。

它使用的白名单（结构性数字、机械动画速率）在脚本里显式写出，所以放宽一条规则是一个可见、可 review
的动作，而不是偷偷改一句正则。

### 架构

```
contracts/        令牌与字符串契约 —— 两个文件，库与应用都同意它们
themes/           每个风格[.模式]一个文件，每个都定义整个契约
                  （九种风格 —— jin、minimalism-and-swiss-style、neumorphism、
                  glassmorphism、claymorphism、flat-design、neubrutalism、
                  brutalism、dimensional-layering —— 各带一个 .dark 变体）
src/core/         纯 TypeScript：定位、焦点、roving tabindex、菜单、树、热键、队列
src/composables/  上述模块的 DOM 那一半，以及浮层控制器
src/injection/    翻译、能力、主题，以及把它们接起来的插件
src/components/   每个控件一个 .vue 文件
src/styles/       一份样式表，根选择器只有 .jin-*
tools/            机械检查
gallery/          Gallery 应用与它的 Tauri 外壳 —— 同时也是 en/zh 的 i18n 示例
```

`src/core/` 是有意思的行为所在，也是可以不用浏览器测试的那部分。如果一个行为可以表达成一个决定，
它就该在那里，而不是在一个 `.vue` 文件里。

---

## 许可

MIT
