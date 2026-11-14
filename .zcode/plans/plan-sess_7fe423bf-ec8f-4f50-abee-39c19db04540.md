# 三个应用各自的自有主题：cteno「栉」· tailtale「墨海」· Ceola「腔棘」

## 背景

cteno、tailtale、Ceola 三个消费端目前默认都用 jin 的招牌风格 `jin`（cteno / tailtale 默认深色，Ceola 默认浅色）。目标：每个应用一套符合自身气质的自有主题并设为默认，代码写进各自仓库，**jin 仓库一行不动**。

jin 的机制完全支持这件事：`data-jin-style` 是自由字符串，不校验、不注册；主题文件自包含地重述全部 80 个契约令牌（`contracts/tokens.json`），由应用自己 import；库的 README「写一个自己的主题」一节就是这条路径的官方说明。

**硬约束（用户要求）**：暗色不得使用大量偏蓝的设计（不护眼）。 jin 自家的深色正是偏蓝的玄青（`#12171d` 系），三套新暗色全部避开蓝移表面。**口径**：大面积表面（bg / surface / raised / sunken / scrim / 文字）用中性或暖色；蓝只允许出现在小面积强调上（cteno 的钢蓝强调色，呼应其深海图标）——如果你连强调色也不想见蓝，审批时说一声，cteno 换琥珀强调即可。

## 三套共同的设计规则（照搬库的三条跨风格约定）

- 每套两个文件：浅色 `:root[data-jin-style='<id>']` + 深色 `:root[data-jin-style='<id>'][data-jin-mode='dark']`；首行 `color-scheme`；结尾 `@media (prefers-reduced-motion: reduce)` 把三个时长归零；**完整重述 80 个令牌**（83 条声明/文件，含 reduce 块）。
- 非玻璃风格：`--jin-surface-translucent` = raised、`--jin-blur: 0px`。
- 深色不是浅色反相：强调色提亮、`--jin-text-on-accent` 翻深色、状态色按模式分别调参；半透明色写成对真实深色底的 rgba 合成。
- 焦点环令牌显式声明、与强调色不同源；对比度口径同 `tools/check_contrast.py`：文字对四类表面 ≥4.5、焦点环 ≥3、text-on-accent 对三个强调态 ≥4.5、状态文字对合成后的底 ≥4.5、状态填充对 raised ≥3。
- 老用户不受影响：三个应用继续装载库风格、存过的 `jin` 偏好仍有效，只改默认值。
- z 阶梯、空间尺度（4px 节律）、字号字重沿用库默认值（久经验证）；文件头注释用中文（三仓库的约定都是中文注释），并注明「本应用原创主题 + 对比度由本仓库检查器验证」。

## 设计一：cteno「栉」（id `cteno`）—— 钢与琥珀

概念：文件管理工具，秩序、精确、克制。深海身份由固定不变的图标持有，界面保持**中性钢灰**；琥珀只给「命中」——焦点环与强调边界（呼应图标的命中琥珀齿 `#F59E0B`，也呼应 `--cteno-hit` 本就读 warning 系）。浅色「晨钢」，深色「夜钢」（**中性炭黑，不偏蓝**）。圆角小、阴影短促、动效快——工具的利落。

| 令牌 | 浅色 晨钢 | 深色 夜钢 |
|---|---|---|
| bg / surface / raised / sunken | `#f2f3f2` / `#f8f9f8` / `#fcfdfc` / `#e9eae9` | `#171818` / `#1c1e1e` / `#232626` / `#121313` |
| text / muted / subtle | `#212523` / `#5a605c` / `#666c67` | `#e7eae8` / `#abb1ad` / `#979d98` |
| accent / hover / active | `#2e5f8f` / `#3a6c9d` / `#275179`（钢蓝，小面积） | `#85aed6` / `#93b8dc` / `#77a3cf` |
| text-on-accent | `#ffffff` | `#10161c` |
| focus-ring / border-strong | `#8a5f14` / `#8a5f14` | `#d9a94e` / `rgba(217,169,78,.55)` |
| border / scrim | `rgba(33,37,35,.14)` / `rgba(23,26,24,.42)` | `rgba(231,234,232,.13)` / `rgba(4,6,5,.62)` |

- 形状：radius 4/6/8；控件高 28/34/42（工具密度）。
- 深度：短促分层的阴影；`--jin-surface-gradient: none`；texture = 竖向「栉齿」细纹（8×8 SVG 竖线，墨 4% / 深色象牙 4%，只作用于 `.jin-ground` 装饰位）。
- 状态色：浅色 danger `#a8323c`/`#8c2a2f`/`#faeceb`，warning `#96601a`/`#7a4c12`/`#faf3e1`，success `#3f7a4c`/`#33653f`/`#ecf4ee`，info `#2a6a78`/`#235f6b`/`#e7f1f3`（info 偏青，与钢蓝强调拉开）；深色用提亮填充 + 对 raised 合成的 rgba 底（danger `#e2706f`/`#eb9a94`/`rgba(190,70,70,.18)` 等一族）。
- 动效：120/170/220ms；缓动同库曲线。字体：UI 与 display 同一 sans（单一声音的工具）；mono 沿用库栈；line-height 1.5。

## 设计二：tailtale「墨海」（id `tailtale`）—— 纸与墨与海

概念：人机协作的小说写作软件。浅色是晨间的纸页（暖白、墨字），深色是**灯下的暖褐墨色**（不用蓝，最护眼的暗色方向）；海的青只作强调（呼应鲸尾图标，但取青绿而非蓝）；衬线只用于标题（`--jin-font-display`，与编辑器的 Georgia/Noto Serif SC 一脉）。圆角大、阴影柔、动效温吞——阅读软件的从容。

| 令牌 | 浅色 纸海 | 深色 夜航 |
|---|---|---|
| bg / surface / raised / sunken | `#f7f3e9` / `#fcfaf3` / `#fffdf6` / `#eee9da` | `#1a1611` / `#201b15` / `#28221a` / `#14100b` |
| text / muted / subtle | `#26211a` / `#5d574b` / `#6a6456` | `#ece5d6` / `#aba293` / `#978e7f` |
| accent / hover / active | `#175e66` / `#1c6e77` / `#12525a`（深海青） | `#5fb4ba` / `#6ec2c8` / `#52a3a9` |
| text-on-accent | `#ffffff` | `#0e1f20` |
| focus-ring / border-strong | `#8a6a1c` / `#8a6a1c`（灯下金） | `#d9b054` / `rgba(217,176,84,.55)` |
| border / scrim | `rgba(38,33,26,.15)` / `rgba(30,26,18,.44)` | `rgba(236,229,214,.13)` / `rgba(8,6,3,.6)` |

- 形状：radius 8/12/16；控件高 32/38/46（舒展）。
- 深度：柔和大阴影；gradient = 暖纸上光（顶部 50% 暖白渐隐）；texture = 横向帘纹纸纹（墨 4% / 象牙 4%）。
- 状态色：浅色 danger `#a63a2e`/`#8a2f24`/`#faece8`，warning/success/info 同库系；深色提亮 + rgba 底（danger `#e2735f`/`#eb9a8a`/`rgba(195,85,65,.18)` 等一族）。
- 动效：170/230/300ms。字体：UI sans；**display = 衬线**（`'Noto Serif SC','Source Han Serif SC','Songti SC',Georgia,'Times New Roman',serif`）；line-height 1.7。

## 设计三：Ceola「腔棘」（id `coela`）—— 账本与深海

概念：本地优先的投资管理，规则驱动、纪律、长期存续（腔棘鱼穿越纪元）。浅色是晨间的账本页（**绿调白**、墨绿强调、金色焦点——图标双环的绿与金）；深色是**绿黑的深海夜账**（腔棘鱼的深海，但不蓝移）。发丝线承担层级，圆角克制，动效沉稳——数字优先的冷静版面。

| 令牌 | 浅色 晨账 | 深色 夜账 |
|---|---|---|
| bg / surface / raised / sunken | `#f1f3ef` / `#f7f9f5` / `#fbfcfa` / `#e7eae3` | `#101411` / `#151a16` / `#1b211c` / `#0c0f0d` |
| text / muted / subtle | `#1d221e` / `#59605a` / `#666d66` | `#e5eae4` / `#a6ada6` / `#939a92` |
| accent / hover / active | `#2e6b4f` / `#37795c` / `#275d43`（账本绿） | `#6fbf94` / `#7fcb9f` / `#63b088` |
| text-on-accent | `#ffffff` | `#0d1712` |
| focus-ring / border-strong | `#8a6d1a` / `#8a6d1a`（金环） | `#d4b455` / `rgba(212,180,85,.55)` |
| border / scrim | `rgba(29,34,30,.15)` / `rgba(21,26,22,.42)` | `rgba(229,234,228,.13)` / `rgba(3,6,4,.62)` |

- 形状：radius 2/4/6；控件高 30/36/44（标准）。
- 深度：最小但分层的阴影；gradient / texture 均 `none`（克制，发丝线承担结构）。
- 状态色：浅色 danger `#a8323c`/`#8c2a2f`/`#faeceb`，warning 同库系，success `#4f8542`/`#3e6a33`/`#edf4e9`（偏黄绿，与账本绿强调拉开），info 同库系；深色提亮 + rgba 底。
- 动效：160/220/280ms。字体：UI sans；display = 衬线（延续现状——页面标题本就吃 `--jin-font-display`）；line-height 1.6。

以上关键对的对比度已手算预核（文字 ≥11:1、焦点环 ≥4.8:1、强调 ≥5.7:1 量级，均有余量），实现时由各仓库新检查器精确复验并微调。

## 各仓库改动清单

### cteno（`D:\Flora\ProgramProjects\cteno`，改动最多：前端 + Rust + 检查器 + 文档）

1. **新建** `apps/desktop/web/src/theme/cteno.css` + `cteno.dark.css`（与 `cteno-tokens.css` 同目录）。
2. `src/theme/index.ts`：import 两个新文件；`SKINS` 首项加 `{ key: 'cteno', label: 'Cteno · 栉' }`（检查器要求默认=第一项）；`DEFAULT_SKIN = 'cteno'`；头注释从「应用不再自带皮肤」改写为「应用自带栉皮肤 + 库的九个风格」。
3. `src/main.ts`：`theme.defaultStyle: 'cteno'`（注释同步改）。
4. `index.html`：静态 `data-jin-style="cteno"`（首帧默认；镜像脚本逻辑不动）。
5. `crates/cteno-core/src/settings.rs`：`THEME_OPTIONS` 首项 `("cteno", "Cteno · 栉")`；`theme_default()` → `"cteno"`；注释改写。
6. `scripts/check_themes.py`：主题文件查找改为「已装库 `themes/` **或** 应用 `src/theme/`」；对应用自有主题文件新增两项检查——80 令牌齐全（对照 node_modules 里的契约）+ 对比度矩阵（移植 `tools/check_contrast.py` 的算法：WCAG 亮度、rgba 先合成到 raised、同阈值表）；docstring 同步改写。
7. 文档：`web/README.md` §皮肤、根 `AGENTS.md` §主题与令牌与完成标准里 check:themes 的描述、`store/settings.ts` 头注释——把「应用不带皮肤」的说法全部更新。
8. 不需要动 `SettingsDialog.vue` / `store/settings.ts` 逻辑（皮肤选项与协商都从 SKINS/DEFAULT_SKIN 派生）。

### tailtale（`D:\Flora\ProgramProjects\tailtale`）

1. **新建** `src/themes/tailtale.css` + `tailtale.dark.css`。
2. `src/main.ts`：在 18 个库主题 import 之后加两行 `import './themes/tailtale.css'`（+.dark）；注释「九套风格」改为「库九套 + 应用自有墨海」；`theme` 选项加 `defaultStyle: 'tailtale'`——**必须放在 `...loadThemePreferences()` 之前**，否则会盖掉用户存过的偏好。
3. `src/theme-preferences.ts`：`AVAILABLE_STYLES` 首项 `{ id: 'tailtale', label: '墨海 tailtale', note: '…' }`；头注释「清单与库的 themes/ 一一对应」改为「库九套 + 应用自有」。
4. **新建** `scripts/check-theme.mjs`（令牌齐全 + 对比度，读 `@bythid/jin/contracts/tokens.json`），`package.json` 加 `check:theme` 并按 `check-jin-strings` 的既有模式链进 `typecheck`。
5. 文档：`docs/tech-stack.md` §UI 加一句（应用自带「墨海」为默认，其余来自库）。

### Ceola（`D:\Flora\ProgramProjects\Ceola`，遵循 adapter 纪律与 CR 流程）

1. **新建** `src/adapter/jin/themes/coela.css` + `coela.dark.css`（adapter/jin 是唯一合法落点）。
2. `src/main.ts`：加两行 import（在库主题之后、`./style.css` 之前）；注释更新。
3. `src/adapter/jin/theme.ts`：`COELA_JIN_STYLE_VALUES = ['coela', 'jin', 'minimalism-and-swiss-style']`；`DEFAULT_STYLE = 'coela'`；label 表从三元表达式改为 Record（`腔棘 Coela（默认）` / `锦 Jin` / `极简瑞士风`）；清单注释更新。
4. `src/stores/app-settings.ts`：`CoelaJinStyle` 联合类型、`VALID_STYLES`、`DEFAULTS.jinStyle` 加/改 `'coela'`（落盘形状 v2 不变，只是值域变宽，老值 `'jin'` 继续合法）。
5. `src/adapter/jin/theme.test.ts`：默认值断言 `'jin'` → `'coela'`。
6. **新建** `tools/verify-theme.mjs`（同 tailtale 的检查器，路径不同），链进 `pnpm verify`；`package.json` 加脚本。
7. 文档：`src/adapter/jin/README.md` §2 表加 themes/ 一行、§3 硬约定 #3 补一句例外（主题文件**定义**契约令牌而非读令牌，仍然只有一套颜色体系）；`docs/todo/change-requests.md` 按现有格式追加一行（adapter 目录改动走 CR）；`docs/jin-incubation-log.md` 视现有条目格式追加一行（应用自有主题 = ceola 域决策）。

## 验证

1. **检查器与门禁**：
   - cteno：`cd apps/desktop/web && pnpm run check:themes && pnpm run check:i18n && pnpm run typecheck && pnpm run build`；Rust 侧 `cargo build --workspace`（零警告）+ `cargo test --workspace`（先 grep `theme_default` 相关测试）。
   - tailtale：`pnpm typecheck && pnpm test`。
   - Ceola：`pnpm verify`（lint + format + typecheck + test + build 全链）。
2. **对比度**：三个新检查器各自打印 6 个主题文件（3 套 × 明暗）的全部受检对的实际比值，全部达标才继续。
3. **浏览器目检**（jsdom 量不了布局，主题改动必须过眼）：逐个 `pnpm dev` 起本地服务，用浏览器确认——新主题浅色/深色首屏、设置页切换到库风格再切回、无「令牌缺失掉回兜底值」症状（浮层/菜单/提示的取色正常）。
4. **不提交 commit**——三个仓库的改动都留在工作区，由你过目后按各仓库的提交约定自行提交（cteno 约定一次提交一个主题）。

## 明确不做的事

- jin 仓库（含 gallery、checkers、文档）一行不动。
- 不改各应用的既有语义色与业务样式（cteno 的 `--cteno-*`、tailtale EditorPane 的存量硬编码、Ceola 的图表取色）——它们读 `--jin-*`，会自动跟随新主题。
- 不删任何库风格的装载与可选项，不动已存用户偏好的校验逻辑。
- 顺带观察（不在本次范围）：Ceola 的 `public/favicon.svg` 还是 Vite 脚手架默认闪电图标，与其图标不成套，值得另开一次小改动。