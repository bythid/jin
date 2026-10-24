[English](docs/README.en.md) | **简体中文**

> 本文件是中文版；英文版在 [`docs/README.en.md`](docs/README.en.md)，两份内容一致，改动其一即
> 须同步另一份。`docs/` 下除 [`docs/theming.md`](docs/theming.md)（中文）外都是英文。

# Jin · 锦

面向桌面应用的 Vue 3 控件库。它提供按钮、表单、浮层、导航、消息提示等常用控件，每个控件都能
用键盘完整操作；界面外观（颜色、圆角、阴影、动效）完全由主题文件决定，库的源码里不出现任何硬
编码样式值——这条由检查脚本强制（见 [docs/developing.md](docs/developing.md)）。

**关于名字。** 锦是提花织物：由重复的小单元织成，可以染成不同配色。这个库的结构相同——组件是
重复使用的单元，外观由主题文件整体替换。名字读中文拼音 `jin`，不是日语发音。

---

## 安装

包已发布到 npm（`@bythid/jin`，0.x 阶段，见「版本与变更」）：

```bash
npm install @bythid/jin
```

离线交付或本地联调也可以走 tarball 或源码 checkout：

```bash
npm install /path/to/jin                   # 本机的一个 checkout
npm install ./bythid-jin-<version>.tgz     # `npm pack` 的产物
```

`vue` 是 **peer 依赖**（`^3.5`），本库从不自带第二份 Vue。应用里一旦存在两份 Vue，症状是响应式
静默失效而不是报错，原因见 [docs/consuming.md](docs/consuming.md)。

入口文件里需要这四行 import：

```ts
import { JinUI } from '@bythid/jin'              // 插件，以及你要用的组件
import '@bythid/jin/styles.css'                  // 基础样式表 —— 必需
import '@bythid/jin/themes/jin.css'              // 一个风格（jin 是默认风格）
import '@bythid/jin/themes/jin.dark.css'         // 以及它的深色模式
```

基础样式表必须由应用自己写下这条 import，插件不会自动引入——从依赖内部引入的样式表可能被使用方
的打包器丢掉，而且没有任何报错：控件照常渲染，只是全部失去样式。启动时如果它没有加载，插件会在
console 警告一次，并写出缺的是哪条 import。

### 同时开发本库和你的应用

用 `file:` 依赖直接读库源码，改完立刻生效、无需重新构建。需要三处配置，各管一件事：

```jsonc
// 应用的 package.json
{ "dependencies": { "@bythid/jin": "file:../jin" } }
```

```ts
// vite.config.ts
export default defineConfig({
  resolve: {
    conditions: ['source'],   // 打包器读库的源码入口，而不是 dist/ 构建产物
    dedupe: ['vue'],          // 少了它，被链接的库会带进第二份 Vue
  },
  server: {
    fs: { allow: ['..'] },    // 库在应用根目录之外，dev server 默认拒绝读取
  },
})
```

```jsonc
// tsconfig.json —— 同一个条件，给编辑器和 vue-tsc 用
{ "compilerOptions": { "customConditions": ["source"] } }
```

少了 `customConditions`，类型来自 `dist/index.d.ts`，永远落后你正在编辑的源码一个构建。三处配置
配错的完整症状表在 [docs/consuming.md](docs/consuming.md)（英文）。

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

### `JinUI` 的三个配置项

| 选项 | 作用 | 省略时 |
| --- | --- | --- |
| `t` | 翻译本库的界面文案 | 使用内置的英文默认文案 |
| `capabilities` | 向本库注入桌面能力：`pickFolder` / `openExternal` / 剪贴板 | 需要它们的控件隐藏对应入口，而不是报错 |
| `theme` | 接收主题变化通知，由应用自己持久化；本库从不读写任何存储 | 风格与模式只在本次会话内有效 |

本库需要的全部文案 key 及其默认文本声明在
[`contracts/strings.json`](contracts/strings.json)。没有一个 key 含业务词——本库没有业务词汇可
翻译。字典以源文本（比如中文）为 key 的应用，自己写一层从这些 key 到自家词条的映射；那一层属于
应用，写法见 [docs/consuming.md](docs/consuming.md)。

---

## 主题

风格与模式是两条相互独立的轴，作为属性设在 `<html>` 上：

```html
<html data-jin-style="jin" data-jin-mode="dark">
```

| 属性 | 取值 |
| --- | --- |
| `data-jin-style` | 视觉风格：`jin`（默认）加 8 个目录风格，见下表 |
| `data-jin-mode` | `dark`（Jin 的标志性模式「玄锦」）或 `light`（「素锦」）；每个风格都提供两种 |

外观的每一项取值都来自 CSS 自定义属性（设计令牌），共 80 个，清单在
[`contracts/tokens.json`](contracts/tokens.json)。每个主题文件都完整定义这 80 个，不依赖其他主题
留下的值——所以换一个主题就是换一组文件，不需要追查某个变量的值来自哪一层。

随库发布九种风格。选取标准是覆盖不同的设计取向：同样的「深度」，一种风格用弥散阴影表达，另一种
用硬偏移、模糊或内阴影表达，还有干脆不表达深度的。

| 风格 | 圆角（sm / md / lg） | 深度 | 边框 | 动效（base） |
| --- | --- | --- | --- | --- |
| **Jin · 锦**（默认） | 6 / 8 / 12px | 弥散阴影 + 微浮雕 | 1px 金线 | 200ms |
| **极简 / 瑞士国际主义** | 0 | 无 | 1px 发丝线 | 250ms |
| **新拟态** | 10 / 14 / 18px | 明暗成对阴影 + 内阴影 | 1px，贴近表面 | 200ms |
| **玻璃拟态** | 8 / 14 / 18px | 弥散彩色阴影 | 1px 亮边 | 220ms |
| **黏土拟态** | 14 / 20 / 24px | 厚度偏移 + 柔和投影 + 内高光 | 3px，柔色 | 240ms，回弹缓动 |
| **扁平设计** | 2 / 4 / 6px | 无，显式声明为 `none` | 1px 线 | 180ms |
| **新粗野主义** | 0 | 硬偏移，无模糊半径 | 3px 黑 | 150ms |
| **粗野主义** | 0 | 无 | 3px，始终可见 | 0s |
| **维度分层** | 6 / 10 / 14px | 四级阴影 | 1px 发丝线 | 200ms |

标题读取 `--jin-font-display`：在 Jin 风格里它是第二字族（衬线/宋体），在其余风格里与正文同字族；
纹理令牌 `--jin-surface-texture` 只有 Jin 定义经纬网格图案，其余八个风格全部为 `none`。

### 写一个自己的主题

1. 从 `contracts/tokens.json` 复制令牌清单（可通过 `@bythid/jin/contracts/tokens.json` 导入）。
2. 在 `:root[data-jin-style='your-style']` 下定义**全部** 80 个令牌。
3. 焦点环令牌 `--jin-focus-ring-*` 必须显式声明，不要从强调色推导：某个风格的强调色恰好接近它
   自己的背景时，推导出的焦点环会几乎看不见，而键盘焦点是无障碍的硬性要求。
4. 文字与背景的实际对比度至少 4.5:1，焦点环与其表面至少 3:1。半透明颜色要先合成到它真实所在的
   背景上再计算。仓库里的 `tools/check_contrast.py` 用的就是这个口径。

`--jin-` 前缀同时是 CSS 命名空间和组件命名空间，冻结不变：改前缀等于同时改掉所有主题文件、所有
令牌引用和全部组件类名，所以它以后不会变。

### 这些风格从哪来

**Jin（锦）是原创设计**——本库自己的视觉风格，也是默认风格。

**其余八种风格是对
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
（MIT，© 2024 Next Level Builder）目录条目的独立实现。** 该目录是一个可检索的 UI 风格清单，只提供
设计指引、不提供 CSS，因此本库没有复制它的任何样式表；「令牌必须覆盖形状、深度与动效而不只是颜色」
这一要求正是从这个目录提出的。八个实现条目为 `minimalism-and-swiss-style`、`neumorphism`、
`glassmorphism`、`claymorphism`、`flat-design`、`neubrutalism`、`brutalism`、
`dimensional-layering`。逐个署名见 [CREDITS.md](CREDITS.md)，每个主题文件头部也写明来源。

---

## 控件清单

**反馈** —— `JinSpinner` `JinProgress` `JinSkeleton` `JinAlert` `JinToastRegion`
`JinNotificationRegion` `JinResult`
**浮层** —— `JinModal` `JinDrawer` `JinPopover` `JinTooltip` `JinPopconfirm`
**表单** —— `JinField` `JinTextField` `JinSearchField` `JinSelect` `JinCombobox` `JinCheckbox`
`JinRadioGroup` `JinSwitch` `JinHotkeyRecorder`
**导航** —— `JinTabs` `JinMenu` `JinDropdown` `JinContextMenu` `JinBreadcrumb` `JinDivider`
`JinCard` `JinToolbar` `JinNav` `JinTree`
**数据** —— `JinBadge` `JinTag` `JinDetailList` `JinLink` `JinIcon`

逐个控件的属性、事件、插槽与无障碍行为在 [docs/components.md](docs/components.md)（英文）。

**刻意不提供的控件**：日期与时间选择器、颜色选择器、数据网格、虚拟列表、头像、轮播、滑块、评分
和产品引导。日历是一个完整产品的工作量；文字、标签、链接用 CSS 和排版令牌就能解决，做成共享控件
没有收益。

### toast 与 notification 的区别

两者外观相似，不可互换：

| | toast | notification |
| --- | --- | --- |
| 生命周期 | 到时自动消失 | 一直留在那里，直到被关闭 |
| 是否打断 | 从不——它不该要求回应 | 会；它就是用来承载决定的 |
| 用来放什么 | 确认「刚刚发生了什么」 | 用户必须处理的事 |
| 被忽略时 | 什么也没丢 | 稍后它还在那儿 |

两者共用同一条队列，所以淘汰规则很重要：当一个位置满了，被丢掉的是**最旧的 toast**，永远不会丢掉
notification。丢掉一条确认只是轻微的不便；丢掉一个用户还等着做的决定不是。

---

## 可访问性

以下行为对每个控件成立：

- 每个可交互控件都能用键盘到达，并有取自焦点令牌的可见焦点环。
- 浮层打开时焦点锁定在浮层内，关闭时归还给打开它的元素——触发元素变得不可聚焦时归还给它附近
  可聚焦的元素，绝不归还到 `<body>`。
- 嵌套浮层逐个关闭：Escape 只作用于栈顶那一层。
- 状态从不只靠颜色传达。每个 tone 都配图标，每个要紧的取值同时以文字出现。
- `prefers-reduced-motion: reduce` 把所有时长令牌置为 `0s`；唯二豁免的是加载动画——spinner 的
  旋转和骨架屏的扫光——因为停住的 spinner 不再表示「正在加载」。
- 成组的控件（标签页、菜单、工具栏、树、选择器、单选组）整组占一个 tab 停留点，组内用方向键移动。

---

## 版本与已知限制

- 版本遵循 Semantic Versioning 在 1.0 之前的约定：`0.y` 只做修复，`x` 递增可能改行为或 API。每个版本应用需要
  做什么，都写在 [CHANGELOG.md](CHANGELOG.md) 的对应条目里。
- 本库面向桌面应用。例如 `JinContextMenu` 没有实现长按触发，触屏设备目前打不开它。
- 长列表不做虚拟滚动。500 条选项下，打开浮层到首次绘制约 65ms，一次筛选按键 1–6ms（v0.4.0 在
  Gallery 的 dev 构建实测）；超过这个量级的数据量需要应用自己处理。
- 三个 prop 声明了但未实现，设置它们不产生任何效果：`JinPopover` 的 `lazy`、`JinDropdown` 的
  `chevron`、`JinBreadcrumb` 的 `maxItems`。
- 样式表依赖 CSS 自定义属性、`:focus-visible` 和 `backdrop-filter`（玻璃拟态使用最后一项）。

---

## 文档

| 文档 | 读者 | 内容 |
| --- | --- | --- |
| [docs/consuming.md](docs/consuming.md) | 应用开发者 | 集成的完整指南：依赖方式、Vite/tsconfig 配置、配错的症状表 |
| [docs/components.md](docs/components.md) | 应用开发者 | 每个控件的 API 参考与无障碍行为 |
| [docs/developing.md](docs/developing.md) | 仓库维护者 | 在本仓库开发：命令、检查脚本、Gallery、打包与发布 |
| [docs/theming.md](docs/theming.md)（中文） | 仓库维护者 | Jin 风格的设计规范与已实现风格清单；内部设计文档，与使用无关 |
| [docs/architecture.md](docs/architecture.md) | 仓库维护者 | 库为什么分这样设计：内部设计文档，与使用无关 |

---

## 许可

MIT
