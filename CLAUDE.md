# 德州扑克胜率计算器 — 项目状态与 AI 交接文档

> **本文档用途：** 记录项目每一步进展和未来计划。任何 AI 助手接手本项目前，**必须先完整阅读本文档**，了解项目现状后再继续工作。每次完成新步骤后，AI 必须更新本文档。

**最后更新：** 2026-09-22（第六轮·批次 12 UI 打磨（紧凑对手标题行+大步进按钮）完成，133 测试全绿；**用户已授权：以后每批次做完直接推送**，推送遇 github.com 间歇不通时退避重试即可）
**当前阶段：** 🎉 已上线：https://rho9306.github.io/TexasHoldem-asistant/ · 第六轮批次 1-12。剩余待办：真机验收（§8.2，需用户执行）、用户后续新反馈迭代（§10.5）

---

## 一、项目简介

德州扑克长期收益辅助计算软件：玩家输入手牌、公共牌、底池信息，软件通过蒙特卡洛模拟实时计算胜率、EV（期望值）、底池赔率，并给出跟注/加注/弃牌决策建议。

**核心价值：** 纯数学驱动、离线可用、输入即得结果、帮助玩家学习德扑数学与资金管理。

---

## 二、项目文件结构

```
Texas/
├── CLAUDE.md                  ← 本文档（AI交接文档）
├── poker_assist/              ✅ Windows控制台版（C++17，已完成可运行）
│   ├── core/                  ← 核心算法（card/deck/evaluator/calculator）→ 未来编译WASM复用
│   ├── ui/                    ← 控制台界面
│   ├── main.cpp
│   └── README.md
├── docs/
│   └── superpowers/specs/     ← 设计文档目录
│       ├── 2026-09-20-poker-web-app-design.md          ← ✅ 当前主设计文档（v4.0 策略助手版）
│       ├── 2026-08-23-poker-calculator-implementation.md（Windows实现计划，历史参考）
│       └── poker_assist_ISSUES_SUMMARY.md             （调试记录，历史参考）
└── .superpowers/brainstorm/   ← UI设计可视化对比页面（本次会话产生）
```

> 已删除（2026-09-20）：`poker_assist_esp32/` 整个文件夹、2个ESP32硬件BOM文档、旧版混合设计文档 `2026-08-23-poker-calculator-design.md`（其内容已由 v3.0 网页版设计文档取代）。

---

## 三、重大决策记录（按时间顺序）

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-08-23 | 原始方案：Windows控制台版 + ESP32硬件袖珍设备 | 硬件隐蔽便携 |
| **2026-09-20** | **放弃硬件模式，转向手机网页版/PWA** | ① App Store需$99/年且iOS开发需Mac；② 网页版0成本（GitHub Pages/Cloudflare Pages免费托管）；③ 手机浏览器直接用，可"添加到主屏幕"当App；④ 电脑上浏览器打开即演示，开发调试最方便；⑤ 未来想上架App Store随时可升级（费用后付，风险最低） |

**用户已确认的决策：**
1. ✅ 技术路线：**网页版/PWA**（不是App Store原生、不是Flutter）
2. ✅ 删除范围：**2个ESP32 BOM文档 + 整个 poker_assist_esp32/ 代码文件夹**（彻底告别硬件方案）
3. ✅ UI 风格：**B · 现代深色专业版**（#0d1117 近黑底色 + #22c55e 绿色主色 + 等宽字体数字，数据仪表盘风格）——通过浏览器可视化对比选定
4. ✅ 布局：**方案2 · 响应式工作台**（手机=单列+底部3标签；电脑=三栏平铺：左牌面输入/中结果仪表盘/右底池+历史）。同一套代码，CSS媒体查询自动适配
5. ✅ 用户要求：AI 的每一步操作和未来计划都要记录到本文档

### v4.0 功能升级决策（2026-09-20 第二轮 brainstorm，用户逐项确认）

6. ✅ **产品升级方向：** 从「胜率计算器」升级为「基于范围与对手画像的策略助手」。真实GTO求解（CFR实时运算）在¥0网页方案不可行，采用三条实用化路径：翻前GTO图表查询 + 翻后范围化蒙特卡洛 + 求解器原理启发式
7. ✅ **第一版功能范围（用户确认"1-8"）：** ①范围化蒙特卡洛引擎 ②位置系统 ③对手档案系统 ④人数动态调整 ⑤翻前GTO图表 ⑥牌面纹理分析 ⑦策略建议引擎v2（价值下注/保护/阻隔/诈唬频率MDF/SPR）⑧Nash推弃表。#9对手观察日志、#10决策统计分组放第二版；神经网络对手建模、简化CFR列入远期路线
8. ✅ **对手档案模式：** A方案——每个对手单独一张档案卡（类型：紧凶/松凶/紧弱/松弱，或松紧×凶弱两维滑条），引擎按各自范围分别采样；附"一键设全员为某类型"快捷按钮
9. ✅ **手机端布局：** A方案——**四标签**（计算 / GTO图 / 历史 / 设置）。计算页=牌面+位置+对手+结果+策略一屏完成；GTO图独立成页浏览13×13热力图
10. ✅ **电脑端布局：** D1方案——**四栏工作台**（①牌面+局面输入 ②结果仪表盘 ③策略面板 ④底池/历史），1024-1279px自动降级
11. ✅ **可视化对比服务器：** 本轮已启动（端口51583，`.superpowers/brainstorm/9001-1789897587/`），手机/电脑布局选型已用，其余设计在终端进行（4小时无操作自动关闭）
12. ✅ **6个辅助判断件全部纳入 v4.0：** ①outs计数+4-2法则 ②MDF/α速查 ③起手牌百分位 ④EV双曲线（理论vs实际）⑤隐含赔率（对手类型联动）⑥对手范围透视（模拟顺带统计）
13. ✅ **会话+复盘系统（用户提出并确认）：** Session概念、对手档案持久化+VPIP观察统计（原#9提前进v4.0）、复盘视图+个人弱点矩阵（原#10提前进v4.0）、导出/导入JSON备份
14. ✅ **桌子动态适配器（用户提出，经澄清为"根据全桌对手风格调整自己打法"后确认）：** 全桌画像四象限（松紧×凶弱）→ 自动调整打法建议（松弱桌→紧凶化砍诈唬等），设置页有开关；修正只作用于策略建议倾向，胜率数学不变
15. ✅ **v4.0 设计文档已产出并自审：** `docs/superpowers/specs/2026-09-20-poker-web-app-design.md` 升版 4.0（13章节，含变更摘要表）；分节呈现（架构引擎→场景图表策略→辅助件→复盘→桌子适配→UI/数据/测试验收）全部经用户逐块确认

---

## 四、已完成步骤

- [x] 2026-08-23 Windows控制台版开发完成（核心算法+TUI界面，可正常运行）
- [x] 2026-09-20 浏览项目结构，确认硬件相关文档和代码位置
- [x] 2026-09-20 与用户确认：转向网页版/PWA路线（0成本）
- [x] 2026-09-20 与用户确认：删除2个BOM文档+poker_assist_esp32文件夹
- [x] 2026-09-20 创建本交接文档
- [x] 2026-09-21 回修：poker_assist 原版 evaluator 的4处数学缺陷已从 texas-web 移植修复（三条误判葫芦/顺子提前截断/无踢脚编码伪平局/rankCounts 索引偏移），临时验证程序7项断言全过后删除
- [x] 2026-09-20 启动UI可视化对比服务器（浏览器可视化选型，用户已在浏览器中确认风格B和布局方案2）
- [x] 2026-09-20 手机端3页面蓝图 + 电脑端三栏工作台蓝图已生成，用户确认整体设计（"可以的，你先设计吧"）
- [x] 2026-09-20 **执行删除**：`poker_assist_esp32/` 文件夹 + 2个BOM文档 + 旧版设计文档
- [x] 2026-09-20 **新设计文档完成**：`docs/superpowers/specs/2026-09-20-poker-web-app-design.md`（v3.0，含技术架构/UI规范/算法/数据结构/错误处理/测试/部署/远期路线），已完成规格自审（补齐建议风格定义、统一性能指标）
- [x] 2026-09-20 "电脑看演示"方案已答复并写入设计文档§9（npm run dev + F12设备模拟；部署后手机真机）

### 第二轮：v4.0 功能升级设计（2026-09-20，全部完成）
- [x] 用户提出升级需求（GTO/位置/对手类型/出牌策略/更多算法），brainstorm 澄清方向与范围（1-8模块）
- [x] 对手档案模式确认（每对手独立卡片）；手机四标签 / 电脑D1四栏布局（浏览器可视化对比选定）
- [x] 分节设计呈现并逐块确认：①架构+范围化引擎 ②翻前场景+GTO图表+策略引擎v2 ③6个辅助件 ④会话+复盘系统 ⑤桌子动态适配器 ⑥UI落位+数据结构+测试验收
- [x] **v4.0 设计文档写入并自审通过**（13章节，见 §七 索引）
- [x] 本交接文档同步更新（决策6-15、待办、要点）

> ⏭️ **下一步：** 见 §五「阶段A+」——用户审阅 v4.0 设计文档后，调用 writing-plans 技能产出实施计划

### 第三轮：设计审阅 + 实施计划（2026-09-20，全部完成）
- [x] 新会话接手：完整阅读本交接文档 + v4.0 设计文档 + poker_assist/core 四个头文件与 calculator.cpp（确认 EV 公式约定与 v1 平局计数缺陷）
- [x] 用户审阅通过 v4.0 设计文档（"通过，开始写实施计划"）
- [x] 实施计划产出并自审：`docs/superpowers/plans/2026-09-20-poker-web-app-implementation.md`（27任务/6阶段，含 GTO 网格数据、接口签名表、引擎基准、部署工作流）
- [x] 本交接文档同步更新（阶段A+勾选、当前阶段改写）
- [x] 2026-09-20 Task 2: Vite+Vitest 工程骨架跑通（texas-web/）
- [x] 2026-09-20 Task 3: Emscripten 工具链安装（C:\emsdk）+ WASM 构建管线 ping 跑通
- [x] 2026-09-20 Task 4: HandRange 169格静态模型（类索引/类名/组合数）+ 引擎测试框架（TDD）
- [x] 2026-09-20 Task 5: 范围加权采样（占用避让+重采样兜底）+ liveCombos（TDD）
- [x] 2026-09-20 Task 6: calculateEquityV2 范围化蒙特卡洛+范围透视+embind，6项基准全过
- [x] 2026-09-20 Task 7: evaluateDecision 风格参数化决策 + WASM loader 容错（TDD）
- [x] 2026-09-20 Task 8: rankTable 169类引擎生成百分位表（vs均匀3000次/类）
- [x] 2026-09-20 Task 9: GTO图表数据——13张常规表+3档Nash推弃+查询API（关键格+宽度测试）
- [x] 2026-09-20 Task 10: ranges 对手类型/滑条/观察值→169格掩码（骨架表×系数，观察值优先）
- [x] 2026-09-20 Task 11: texture 牌面纹理分析（同花性/连线性/结构→评级，A低顺修正）

- [x] 2026-09-20 Task 12: mdf MDF/α+outs检测+4-2法则（纯公式，后门/双重计数口径注释）
- [x] 2026-09-20 Task 13: sizing c-bet尺寸/SPR/河牌价值诈唬比/防守建议
- [x] 2026-09-20 Task 14: implied 隐含赔率 + tableDynamics 桌子动态适配器（阶段B策略层8模块全部完成）
- [x] 2026-09-20 git仓库初始化（main + feature/web-v4 分支）+ .gitignore
- [x] 2026-09-20 Task 15: 设计令牌CSS+应用骨架+四标签路由+state store
- [x] 2026-09-20 Task 16: cardPicker 选牌器 + potForm 底池输入校验
- [x] 2026-09-20 Task 17: positionBar 位置条+翻前场景 stepper + opponentCards 对手档案卡
- [x] 2026-09-20 Task 18: calc.js recalc 编排（范围→WASM→决策）+ resultPanel 仪表盘
- [x] 2026-09-20 Task 19: 计算页完整装配（策略卡组/桌子画像/对手抽屉/承接项a-d）——提交至 035bc97（含修复回合：类型快选同步type字段）
- [x] 2026-09-20 Task 20: handMatrix 13×13复用组件 + chartViewer GTO图页 —— 代码提交 79e6547，**2026-09-21 恢复后补审通过**（规格✅/质量Approved，仅Minor）
- [x] 2026-09-21 Task 21: 设置页（精度/风格/桌子适配开关/数据占位/关于）—— settingsPage.js + main.js 按需渲染接线；导出/导入/清空为占位（Task 22/23 接线）。**阶段C完成**
- [x] 2026-09-21 Task 22: 数据层存储—— storage.js 四键(localStorage)+1000手FIFO+newSession/buildHandRecord/updateOpponentObservation（滚动VPIP），ui/sessionBar.js 顶栏会话指示，main.js window.__recordHand 接线（含对手VPIP推断更新+会话handsCount/netResult/evTotal同步+按钮"已记录"反馈）
- [x] 2026-09-21 Task 23: 导出/导入—— exporter.js exportAll/importAll（app/version校验，失败不写库），设置页接线：Blob下载 texas-backup-YYYYMMDD-HHmm.json、导入按钮✓/✗反馈+state刷新重渲、file input 修 catch+value重置（CARRY-FIX）；onClear 仍占位留待 Task 24

- [x] 2026-09-21 Task 24: 历史页—— historyList/evCurve/weaknessMatrix/reviewCard 四模块（筛选条split修复+用户字段XSS防护+无会话手归"未分组"），main.js 接 history 分支+复盘 dialog+onClear 清空（对手档案保留）；**阶段D完成**


- [x] 2026-09-21 Task 25: 电脑四栏工作台——≥1024px `#workspace` 四栏（1.1:1:1.2:0.9，1024-1279px 历史并底三栏）+ matchMedia 双模式整树重建（手机布局不变）+ 键盘快捷键（rank+花色数字录入/Enter 确认部分选择/C 清空/Space 重算，window.__confirmCards/__clearCards/__recalc）+ CARRY-FIX 三件（select/checkbox 44px、历史行按钮 44px、btn-danger 类）

> ⏸️ **暂停点已解除（2026-09-21）：** Task 20 补审通过，Task 21-27 完成，终审通过并合并 main。剩余仅部署上线与真机验收（§八）。

- [x] 2026-09-21 Task 26: PWA基础——public/manifest.webmanifest + public/sw.js（缓存优先，CACHE 版本号手更触发旧缓存清理，构建产物 fetch 动态缓存兜底）+ index.html manifest 链接/SW 注册 + scripts/gen-icons.mjs 零依赖生成♠占位图标192/512（PLAN-DEVIATION：PWA文件由 texas-web/ 根改放 public/，Vite 原样拷入 dist 根，vite.config.js 无需改动）
- [x] 2026-09-21 **用户三决策执行**：①部署目标=GitHub Pages；②evaluator 回修（见上，提交 821f30c，审查确认两文件逻辑逐行一致）；③8个 debug_test*.cpp+exe 已删除
- [x] 2026-09-21 Task 27（代码部分）: .github/workflows/deploy.yml（push main → npm ci/build → GitHub Pages Artifact 部署）
- [x] 2026-09-21 **最终全分支审查**（opus，fbbf3fe..cb21109）：修复2个跨接缝 Critical——C1 potForm 每击键整树重建丢焦点+NaN 写 state（预填+Number.isFinite 守卫+updateResultsOnly 只刷结果区）；C2 settings/opponents 从不落盘且启动不回填（三处 change 落盘+对手全变动点落盘+启动浅合并回填）；同轮修复3个 Important（导入后刷新计算页/选牌器回显已提交牌/Space 先确认半选）。复审 Approved，**Ready to merge**。测试 75/75+build（提交 d4727fe）
- [x] 2026-09-21 合并 feature/web-v4 → main（ff）
- [x] 2026-09-21 部署成功（GitHub Pages，详见 §8.1/§9.5）
- [x] 2026-09-21 使用说明.md 产出（仓库根，面向使用者）并随迭代多次同步
- [x] 2026-09-21 **第六轮（上线后迭代）批次 1-5 完成**：UX修复轮（自适应网格/点击取消/桌面三栏/编号流程）→ SW 网络优先 → 公共牌自动提交+底池快捷档（删对手筹码）→ 牌桌页+桌面浮层 → 牌桌内嵌中栏+手机下一轮按钮。每批次"实现+独立审查"双裁定，测试基线 77→105，详录见 §十
- [x] 2026-09-21 **第六轮批次 7（Polish：底池默认空+对手默认未标定）**：代码提交 da81b4b、审查通过（数学等价性三路推演确认）、105/105 测试——2026-09-22 已推送上线（随 bedeef3）

---

## 五、待办步骤（按顺序执行）

### 阶段A：清理与设计改写 ✅ 已全部完成（2026-09-20）
1. [x] 删除 2 个ESP32硬件BOM文档
2. [x] 删除整个 `poker_assist_esp32/` 文件夹
3. [x] 删除旧版混合设计文档（算法内容已并入新文档）
4. [x] UI风格选择 → **B·现代深色专业版**（浏览器可视化对比选定）
5. [x] UI页面结构设计 → 手机3页面+底部标签 / 电脑三栏工作台蓝图确认
6. [x] 设计文档改写 → `docs/superpowers/specs/2026-09-20-poker-web-app-design.md`（v3.0，12章节，已自审）

### 阶段A+：实施计划 ✅ 已完成（2026-09-20）
7. [x] 用户审阅通过 v4.0 设计文档；已调用 `superpowers:writing-plans` 技能产出《docs/superpowers/plans/2026-09-20-poker-web-app-implementation.md》——27个任务、6阶段（阶段0基础设施→A引擎→B策略层→C手机UI→D数据复盘→E电脑端与上线），每任务含 TDD 步骤/完整代码/验证命令/提交点，文末含计划自审记录

### 阶段B：网页版开发（按实施计划 Task 1-27 执行）— **27/27 代码全部完成 ✅（2026-09-21）**

| 计划条目 | 对应任务 | 状态 |
|---|---|---|
| 8. 搭建 texas-web 项目 | Task 1-3 | ✅ 完成（git仓库/Vite+Vitest骨架/Emscripten管线） |
| 9. 引擎层 calculateEquityV2+基准 | Task 4-7 | ✅ 完成（6项基准+守恒+风格区分全过；⭐evaluator 4处缺陷修复） |
| 10. 策略层JS（图表/纹理/尺寸/MDF/outs/隐含赔率/桌子动态） | Task 8-14 | ✅ 完成（8模块，35测试） |
| 11. 手机四标签UI | Task 15-21 | ✅ 完成（Task 20 于 2026-09-21 补审通过；阶段C完成） |
| 11b. 电脑四栏工作台+F12双视口 | Task 25 | ✅ 完成（F12 四视口走查分期至 Task 27 真机/浏览器验收） |
| 12. 数据层：四存储键+FIFO+导出导入+会话复盘 | Task 22-24 | ✅ 完成（阶段D完成；settings/opponents 落盘+启动回填由终审 C2 修复补齐） |
| 13. 部署上线+真机验收 | Task 26-27 | ✅ **已部署**（2026-09-21，https://rho9306.github.io/TexasHoldem-asistant/ ）；真机验收清单见 §8.2（待用户执行） |

### 阶段C：远期可选
12. ⬜ PWA增强（manifest、Service Worker离线缓存、添加到主屏幕引导）
13. ⬜ （可选）App Store 上架（$99/年开发者账号；Codemagic云构建可免Mac）

### 上线后迭代（第六轮起，用户实测反馈驱动）— 当前状态见 §十
- [x] **Polish 轮收尾 3 步**（2026-09-22 完成，见 §十.3）：使用说明同步 → push → 部署验证
- [ ] 真机验收（§8.2 清单，需用户手机/浏览器；含 F12 四视口走查）
- [ ] 留档 Minor 裁量池（§10.4，用户反馈时按需修）
- [ ] 候选功能方向：庄位/轮次持久化（现为会话内存）、对手观察值一键修正入口、电脑顶栏按钮触控尺寸

---

## 六、关键技术要点（接手AI必读）

1. **核心算法可完全复用：** `poker_assist/core/` 是平台无关的C++17代码（蒙特卡洛模拟、EV计算、牌力评估）。网页版通过 **Emscripten 编译为 WebAssembly** 复用，无需重写数学逻辑；v4.0 仅新增 `range.h/cpp`（13×13范围加权采样），evaluator/card/deck 不动。
1a. **evaluator 4处存量数学缺陷两版均已修复**（2026-09-20 Task 6 修 texas-web 副本：三条误判葫芦/顺子提前截断/无踢脚编码伪平局/rankCounts 索引偏移；2026-09-21 用户决策回修，已精确移植回 poker_assist/core/evaluator.cpp，审查确认两文件忽略行尾后逐行一致；另 Deck(seed) 构造不洗牌，调用点须显式 deck.shuffle()）。
2. **分工原则（v4.0）：** 数学运算在 WASM（快），策略规则在 JS 策略层 `src/strategy/`（纯函数、好改好测）。策略层只做查表与简单公式，无重计算。
3. **GTO 数据合规：** 图表为手工整理的公开求解器共识简化范围（约16张、合计<10KB内嵌），不含商业产品数据；产品定位保持"学习/训练工具"+理性游戏提示，不承诺盈利。
4. **硬件方案已彻底删除**（2026-09-20）：ESP32代码文件夹、2个BOM采购清单、旧设计文档中的硬件章节均已不存在。如未来重拾硬件方向需从头重建（放弃原因见§三决策表）。
5. **用户偏好：** 用户使用中文交流；成本敏感（倾向0成本方案）；要求AI持续更新本交接文档。
6. **UI可视化对比工具：** 位于 `.superpowers/brainstorm/`，由 superpowers 插件的 brainstorming 技能产生，服务器4小时无操作自动关闭。本轮会话：`9001-1789897587`（端口51583）。

---

## 七、历史文档索引

| 文档 | 状态 | 说明 |
|------|------|------|
| `docs/superpowers/specs/2026-09-20-poker-web-app-design.md` | ✅ **当前主设计** | **v4.0 策略助手版**：范围化引擎/GTO图表/策略引擎v2/对手档案/桌子动态适配/会话复盘/辅助件/UI规范/测试/部署/远期路线（文首含 v3.0→v4.0 变更摘要表） |
| `docs/superpowers/plans/2026-09-20-poker-web-app-implementation.md` | ✅ **当前实施计划** | 27任务/6阶段：Task 1-27 含完整代码、TDD步骤、验证命令；执行必读其"全局数据约定"（169格索引/网格编码/52位图）与"全局约束" |
| `docs/superpowers/specs/2026-08-23-poker-calculator-implementation.md` | 📦 历史参考 | Windows版实现计划（算法类设计细节仍可参考） |
| `docs/superpowers/specs/poker_assist_ISSUES_SUMMARY.md` | 📦 历史参考 | Windows版调试记录（其中ESP32章节已过时，以本交接文档§三为准） |
| `poker_assist/README.md` | ✅ 有效 | Windows版使用说明 |
| `使用说明.md`（仓库根） | ✅ **当前主使用说明** | 面向使用者的网页版操作指南：安装/四标签功能/电脑快捷键/数据与备份/FAQ |
| ~~`2026-08-23-poker-calculator-design.md`~~ | 🗑️ 已删除 | 旧版混合设计（含硬件章节），算法内容已并入设计文档 |
| ~~`ESP32-Hardware-BOM-嘉立创.md` / `-完整版.md`~~ | 🗑️ 已删除 | 硬件采购清单，随硬件方案废弃 |

---

## 八、部署上线步骤（2026-09-21 起，需用户配合）

### 8.1 部署（✅ 已完成 2026-09-21）

- 仓库：https://github.com/rho9306/TexasHoldem-asistant （remote origin 已配置）
- **线上地址：https://rho9306.github.io/TexasHoldem-asistant/**
- 部署流水线：push main → Actions `deploy`（npm ci → build → Pages Artifact）→ 自动发布
- 实际过程留痕：首次运行在 `deploy-pages` 步失败（Pages Source 当时未设 GitHub Actions；构建本身全绿）→ 用户设置 Source 后推空提交触发重跑 → 成功。**教训：Pages Source 必须先于首次部署设为 GitHub Actions；失败重跑用空提交 `git commit --allow-empty && git push` 即可**
- 日常发布：改完代码 → `git push`（main）即自动上线；改 SW 后记得手更 `texas-web/public/sw.js` 的 CACHE 版本号

### 8.2 部署后真机验收清单（Task 27 Step 3，设计§13）

- [ ] 功能：13条功能项手测（选牌/位置/对手/底池→结果与策略卡；记录本手→历史分组/筛选/复盘/弱点矩阵/EV双曲线；GTO页场景切换；设置四项；导出→导入往返；清空历史）
- [ ] 性能：手机真机 2000次×2对手模拟 <300ms；GTO页切换 <50ms；首屏 <3s(4G)
- [ ] 兼容：iPhone Safari + Android Chrome；320px~1920px 无破损；**F12 四视口走查**（iPhone SE/768/1280/1920，Task 25 分期承接）；添加到主屏幕全屏（display:fullscreen 真机体验留意）
- [ ] 离线：第二次访问后断网刷新仍可用（SW 动态缓存兜底；DevTools > Application 查 manifest 无错误）
- [ ] 合规：关于页"学习与训练工具…不承诺盈利…请理性游戏"在产品页可见

### 8.3 环境要点（后续开发/引擎重编译时）

- em++ 前：`export EMSDK_PYTHON=/c/Users/36327/AppData/Local/Programs/Python/Python311/python.exe && source /c/emsdk/emsdk_env.sh`
- 引擎测试命令需 `-Icore` 且输出 `.cjs`（Node24 下 emscripten 产物必须 .cjs 后缀才能 require）
- 测试基线：**75 vitest + 6 引擎基准全绿**；`npm run build` 通过；改 SW 后需手更 CACHE 版本号（`texas-web/public/sw.js`）
- 进度台账：`.git/sdd/progress.md`（每任务提交区间/修复回合/全部 Minor 裁量记录）；任务简报/报告/审查包都在 `.git/sdd/`

### 8.4 已挂起的 Minor 项（终审已逐条裁量：绝大多数留档，详见 progress.md 终审条目）

- 引擎（T3-T7）：core文件缺结尾换行符；className 静态buf非重入；fails 全局int；无idx越界防护；sample 重复块；2.2σ容差；边界断言重复——单线程/种子固定，无实际风险
- 策略层（T8-T14）：topClasses widthPct 未clamp；rank生成脚本双兜底待收敛；JSON缺末尾换行；表注释口径；OPEN.MP第13行推测；ranges.test注释失实；LP/LAG窄表饱和；clamp注释；A低轮子听牌不检测；streetsLeft静默按2
- UI（T15-T26）：streetOf length>5 语义；掩码循环finally；resultPanel无单测；一键预设硬编码TAG；mask图例语义；chartViewer eff下拉不回显；handMatrix.className与charts重复实现；test多余键；复盘dialog Esc不清理（与对手抽屉同模式）；筛选/handHighlight无单测；pending半选Enter不清（行为可辩）；花色分支风格
- 终审新增：potForm清空时UI空红框但state保留旧值（可加title提示）；onImport settings整体替换未浅合并（与启动回填口径不一致）；updateResultsOnly/refresh then块重复可提取
- PWA（T26，真机验收时留意）：SW离线首访无index.html时undefined响应（影响极低）；非导航404回退HTML（不可达）；display:fullscreen 体验；图标无 purpose:maskable（Android留白）

### 8.5 已解决的重要问题（留档备查）

- evaluator 4处数学缺陷修复 + Deck(seed) 不洗牌调用点修复（Task 6，opus 审查逐案手验；2026-09-21 回移 poker_assist）
- charts.js gridCell 异花查表未转置（Task 10 发现）；evaluateDecision 保守偏置方向反转（Task 7）；cardPicker 多实例 picked 串扰（Task 16）；对手抽屉类型快选不同步 type（Task 19）
- **终审修复（2026-09-21）**：C1 potForm 击键重建丢焦点（跨接缝缺陷，单任务审查不可见）；C2 settings/opponents 落盘+回填缺失（VPIP观察链路断裂）；I1 导入后刷新；I2 选牌器回显已提交牌；I3 Space 先确认半选
- 计划自身笔误共10+处（含 Task 24 筛选条字符串解构 bug、Task 22 VPIP `|0` 截断），均以"设计约定优先"修正并留痕于各任务报告

---

## 九、第五轮完整开发记录（2026-09-21，从暂停点到上线）

> 本章为 2026-09-21 会话的全程详录：恢复交接 → Task 20 补审 → Task 21-27 逐任务"实现+独立审查" → 用户三决策执行 → opus 全分支终审 → 合并 main → 部署上线。所有任务简报/报告/审查包/逐任务 Minor 台账都在 `.git/sdd/`（progress.md 为进度台账）。

### 9.1 会话概览

- **起点：** 按 §八（原暂停清单）恢复：先补审 Task 20（79e6547，通过），再按 21→27 顺序执行
- **工作模式：** subagent-driven-development——每任务派独立实现者子代理（简报由 `scripts/task-brief` 生成）→ `scripts/review-package` 生成差异包 → 独立审查者子代理审（规格+质量双裁定）→ 有 Important 以上发现则修复回环+复审
- **模型策略：** 机械转录任务用 haiku，实现/审查用 sonnet，Task 25 审查与全分支终审用 opus
- **结果：** 测试基线 61 → **75 vitest 全绿**（+引擎6基准），5 轮修复回环，全部 Minor 留档裁量，上线成功

### 9.2 工作项时间线（提交全录）

| # | 工作项 | 提交 | 审查结论 |
|---|---|---|---|
| 0 | Task 20 补审（handMatrix+GTO图页，代码为暂停前 79e6547） | — | ✅ Approved（.chip 44px ⚠️ 由控制器核实：全局 button 规则覆盖） |
| 1 | Task 21 设置页 | 7f2e78a + docs 25de235 | ✅ Approved（file input 错误路径→承接 Task 23） |
| 2 | Task 22 存储四键+FIFO+sessionBar+记录本手 | 08d3926 + docs 5fccd0a | ✅ Approved（VPIP `\|0`→Math.round 已修） |
| 3 | Task 23 导出/导入+设置页接线 | 55864c6 + docs bef5ab2；**fix c663c99** | 第1轮：导入成功反馈被重渲冲掉（Important）→修复→✅ Approved |
| 4 | Task 24 历史页四模块+复盘+清空历史 | e445e11 + docs 0f90155；**fix fdae865** | 第1轮：导入JSON残余XSS面（Important）→新建 ui/dom.js esc 全插值点覆盖→✅ Approved |
| 5 | Task 25 桌面四栏工作台+键盘快捷键+CARRY-FIX三件 | 94623c8 + docs 69f4d01；**fix 69a97ad** | 第1轮（opus 审）：Ctrl+C 误清空+Enter双重refresh（Important）→修复→✅ Approved |
| 6 | Task 26 PWA（manifest/sw.js/图标/index.html） | 048a10c + docs 774a5a0 | ✅ Approved（Minor 均为简报自带，真机验收时留意） |
| 7 | 用户三决策执行 | 回修 821f30c + docs cb21109 | ✅ Approved（两版 evaluator.cpp 忽略行尾后逐行一致） |
| 8 | 部署工作流+交接文档收尾 | dc2a892 | — |
| 9 | **最终全分支审查**（opus，fbbf3fe..cb21109）+ 修复 | **fix d4727fe** | With fixes → 修复5项 → ✅ Approved, Ready to merge |
| 10 | 合并 main（ff）、删 feature/web-v4、合并结果复验 75/75+build | — | — |
| 11 | 部署（空提交 0089e0d 触发重跑）+ 上线记录 | f1061b1 | 线上 index/sw.js/manifest 均 200 |

### 9.3 各任务关键实现决策（简报留白处的调度决定，接手 AI 必读）

- **Task 22 记录本手：** sawVpip 场景推断=`call>0||raisesBefore>0||limpers>0`（多路底池无法逐人区分，粗粒度可接受）；记录时同步会话 handsCount/netResult/evTotal；无会话也记录（sessionId=''，历史页归"未分组"）；按钮 1.5s"✓ 已记录"反馈
- **Task 23 接线：** 导出=Blob 下载 `texas-backup-YYYYMMDD-HHmm.json`；导入反馈=按钮文字（成功✓/失败✗，2s还原）；导入成功后 loadAll→setPatch+重渲设置页；CARRY-FIX：file input 补 .catch+value 重置
- **Task 24：** PLAN-FIX——简报筛选条 `['all:全部',...].map(([k,t])=>...)` 字符串解构 bug 改 split(':')；onClear 语义=confirm 后清 texas.hands+texas.sessions，**对手档案保留**；复盘卡 notes/tags/action 用 DOM API 赋值（XSS 防护，后续终审扩展到全部动态字段）
- **Task 25：** 快捷键钩子语义自定——rank 键+花色键(1-4)组合录牌（先手牌后公共牌，遵守 used/slots，用后即清）；`__confirmCards` 顺带修复 board slots=5 翻牌3张永不提交的存量缺口；`__clearCards`/`__recalc`=refresh；INPUT/SELECT/TEXTAREA/dialog 聚焦时忽略；renderCalc 参数化支持双模式（手机四标签不变）
- **Task 26 PLAN-DEVIATION：** PWA 文件从简报的 texas-web/ 根改放 **public/**（vite 原样拷 dist 根，SW scope 正确，免 viteStaticCopy 依赖）；图标由 `scripts/gen-icons.mjs`（Node 内置 zlib 手写 PNG 编码器+参数化♠）生成，脚本与 PNG 一并入库
- **evaluator 回修：** 只移4处数学逻辑（葫芦/顺子截断/踢脚编码/rankCounts），以 poker_assist 自身接口为准；验证=7项断言（K葫芦/wheel/6连张取高/踢脚分高下/3322两对）+ 两文件 diff 逐行一致；临时验证程序用后即删

### 9.4 最终全分支审查（终审）发现与修复详情

终审价值实证：以下 C1/C2 均为**单任务审查不可见的跨任务接缝缺陷**（各任务审查各看各的文件恰好漏掉）。

- **C1 potForm 击键整树重建**：每个 input 事件→setPatch→refresh()→renderCalc() 整页重建，输入框清空失焦，多位数金额实际无法录入；且不预填 state、未填字段写 NaN。**修复**：potForm 从 state 预填4值+Number.isFinite 守卫（非法保留原值）；main.js 新增 updateResultsOnly()（只 recalc+刷结果/策略区，不重建输入区）
- **C2 settings/opponents 两键从不落盘**：saveSettings/saveOpponents 仅有 exporter 与观察更新调用，设置页与对手抽屉只改 state，启动不回填→重启丢配置、VPIP 观察链路端到端断裂、导出为陈旧快照。**修复**：settingsPage 三处 change 落盘；main.js 对手全部变动点（onAdd/onPreset/抽屉保存/删除）落盘；启动 loadAll 回填（settings 与默认浅合并、opponents 非空才覆盖）
- **I1** 导入备份后计算页不刷新→refresh（置于 switchPage 之前，防桌面模式抹掉设置页）；**I2** 选牌器不回显已提交牌→usedCards 传全集含自身+cardPicker 新增 initial 选项（初始化不触发 onPick）；**I3** Space 重算丢半选→`__recalc`=先 confirmPartials，无半选才 refresh
- 补2条测试（potForm 预填/NaN 守卫、settings 落盘往返），基线 73→75
- 终审对历史全部 Minor 逐条裁量：绝大多数留档（单线程/种子固定/不可达），T14 死import、T16 title innerHTML 两项已被后续任务自然解决

### 9.5 部署实录与教训

1. 无 gh CLI → 用户浏览器建仓 rho9306/TexasHoldem-asistant → 控制器 `git remote add` + `git push -u origin main`（GCM 授权一次通过）
2. 首次 Actions 运行：**构建全绿**（npm ci/build/upload 皆过），仅 `deploy-pages` 步失败——Pages Source 当时未设 GitHub Actions
3. 用户设置 Settings→Pages→Source=GitHub Actions 后，控制器推**空提交**触发重跑 → **success**
4. 上线验证：`/`、`/sw.js`、`/manifest.webmanifest` 均 200，标题正确
5. **教训：** Pages Source 必须先于首次部署设置；失败重跑用 `git commit --allow-empty && git push` 即可；github.io 国内访问偶发超时（推送也遇到一次，60s 退避重试成功）

### 9.6 本轮新增的留档 Minor（全部不影响功能，详见 progress.md）

- T21/T23：settingsPage 清空按钮红色内联样式（已改 .btn-danger 类，留档项已闭环）；importAll 中间态部分写入理论可能
- T22：连点反馈时序竞争（clearTimeout 已修）；滚动 VPIP 舍入漂移（精确统计可改存 vpipCount，v4.1 备选）；action 固定'未记录'（复盘可改）
- T24：复盘 dialog Esc 关闭不清理 DOM（与对手抽屉同模式，可统一 close 事件处理）；筛选/handHighlight 无单测
- T25：pending 半选 Enter 不清（行为可辩）；花色分支无 return（纯风格）
- 终审新增：potForm 清空时 UI 空红框但 state 保留旧值（可加 title 提示）；onImport settings 整体替换未浅合并（与启动回填口径不一致）；updateResultsOnly/refresh then 块重复可提取
- T26：SW 离线首访、非导航404回退、display:fullscreen 体验、图标无 maskable——归 §8.2 真机验收观察项

### 9.7 剩余事项

1. **真机验收**（用户执行，清单 §8.2）——功能/性能/兼容/离线/合规五组
2. 远期可选（§五阶段C）：PWA 增强、App Store 上架、对手观察深化、v4.1 改进项（见 9.6 各"备选"）
3. 日常发布流程：改码→push main 自动上线；改 SW 手更 CACHE 版本号

---

## 十、第六轮：上线后迭代记录（2026-09-21~22，用户实测反馈驱动，批次 1-7 全部上线 ✅）

> 背景：第五轮上线后用户开始实测使用，以"反馈→修复/新功能→独立审查→推送自动部署"的节奏迭代。工作模式与第五轮相同（subagent 实现 + sonnet/opus 审查），全部台账在 `.git/sdd/progress.md`（含本轮每个批次的 Minor 留档）。**测试基线从 75 增至 105 vitest 全绿。**

### 10.1 已完成批次（全部已推送上线，除批次6）

| # | 批次（用户反馈） | 提交 | 审查结论 | 测试 |
|---|---|---|---|---|
| 1 | UX修复轮：①选牌器超手机宽需横拖 ②点击已选牌应取消 ③桌面中栏太空 ④流程不清晰 | 35c0680 + docs 1b67ac3 | ✅ Approved（切换状态机/键盘注册表引用共享核查） | 77/77 |
| 2 | SW 部署后用户永远见旧版（纯缓存优先且 CACHE 不升版） | 2edb5b4 | 控制器自审（sw.js 20行，diff 逐行过目） | 77/77 |
| 3 | 翻牌建议不出现 → 部分公共牌无法提交（先加确认按钮 31ac7ba，随后被批次4取代删除） | 31ac7ba（已 superseded） | ✅ Approved | 80/80 |
| 4 | Batch A：公共牌 **3/4/5张自动提交**（删确认按钮，逐街补填自然衔接）；底池表单**删对手筹码**（oppStack=myStack 同步）；跟注**快捷档** ⅓/½/⅔池/满池/全压 | 704ff86 | ✅ Approved（逐街补填状态机/焦点保持/oppStack 无漂移核查） | 83/83 |
| 5 | Batch B：**牌桌页**（椭圆桌/2-9人/座位菜单设庄家+4类型/「开始下一轮」庄位轮转/英雄位置映射）；**桌面端 GTO图+设置 全屏浮层入口**（原桌面无入口是真缺陷） | 752735b | ✅ Approved（**位置映射逐例手算与真实德扑规则一致**；键盘守卫 .fs-overlay 补在正确守卫点） | 95/95 |
| 6 | Batch C：牌桌**内嵌桌面中栏底部**（renderTableInto 提取复用）；手机③标题行 **「🪑 牌桌」+「⏭ 下一轮」** 直达按钮（三入口共享模块级 dealer 状态）；顺手修 mounted 列表缓慢泄漏（pruneMounted 入口剪枝，9b12c00） | 80ef62f + 9b12c00 | ✅ Approved（三入口一致性/无死循环/菜单滚动裁剪核查） | 101/101 |
| 7 | **Polish：底池输入默认空**（空=默认值 0/0/100，placeholder 提示）+ **对手默认「默认」未标定**（type:null 灰徽章，数学与原 TAG 逐值一致——审查者三路推演：掩码同对象兜底/桌画像/implied 二级兜底） | **da81b4b** | ✅ Approved（数学等价性为最高优先核验项） | **105/105** |
| 8 | **存量对手迁移**（用户实测报告：批次7后页面既有对手仍显示紧凶）：storage.js `migrateOpponentDefaults(force)` 存量 TAG→null 一次性迁移（texas.migrations 第5键标记防重跑，空列表也写标记防误迁一键预设）；importAll 绕过修复（审查 Important→回环）：exportAll 给备份打 oppDefaultsV2 标记、旧备份导入即强制迁移、新备份尊重主动标注；SW CACHE v2→v3 | **9bd8368 + 475db10** | ✅ Approved（审查者核实幂等/时序/测试隔离；Important 1条已回环修复） | **110/110** |
| 9 | **引擎加载修复**（用户实测报告：选手牌即「加载计算引擎失败」）：**根因=部署站从未成功加载过引擎**——emscripten 胶水运行时按 scriptDirectory 拼 wasm 路径，vite 静态分析看不到，dist 从未包含 .wasm（线上实测 404）；dev 正常掩盖了问题。修复=pokerCore.js `?url` 引入 wasm + locateFile 显式传入，vite 发出带 hash 的 wasm 资产 | **e0d128b** | ✅ 控制器自审：111/111 测试（含新增加载器回归测试）、dist 含 wasm、vite preview 端到端 200/application/wasm | **111/111** |
| 10 | **行动建议升级**（用户需求：轮到我时给 check/跟/加/弃 + 加注金额）：新 `strategy/action.js` 纯函数——面对下注转译引擎档位（加注至=2×call+pot≡3×下注+前池，超有效筹码→全压）；**补齐 check 语义**（call=0 翻前 open 2.5BB+跛入、盲注位免费过牌；翻后胜率分档 66%/50%池/过牌）；风格偏置±0.03；结果横幅升级为动作+金额+理由。审查回环：翻前金额统一用户单位（bb=10）、pot 未填不下注 0、需胜率仅面对下注显示 | **989a96c + 9f00f7d** | ✅ Approved（数学等价推导核验；Important 1条已回环） | **127/127** |
| 11 | **删除会话+人数上限+SW缓存击穿**（用户三反馈）：①历史页会话组「🗑 删除」（storage.deleteSession 删会话+名下手数；当前会话引用清理+顶栏同步；未分组桶不可删）②加注/平跟上限=人数-1（原硬编码 2/3）③**SW 导航 fetch 加 `cache:'no-cache'`**——根因链：Pages index.html max-age=600 → 浏览器 HTTP 缓存喂给 SW 陈旧 index.html → 旧 hash 入口被静态资源缓存优先命中 → 用户停留旧版（批次10 横幅"看不见"的原因）；CACHE v4；设置页关于加构建标记 | **31c27ba + 8fa150c** | ✅ Approved（0 阻塞；6 Minor 留档，2 条当场回环：显示 clamp+删除计数用未筛选总数） | **132/132** |
| 12 | **UI 打磨两件**（用户反馈）：①手机对手档案标题行只留 牌桌/下一轮（opponentCards compact 选项，`compact:!split`；加对手统一走牌桌页调人数，**电脑保留＋/一键全员**）②.stp 步进按钮加大（原完全无样式=浏览器默认小按钮；44×44+18px bold）。审查回环：.scenarios 加 flex-wrap（44px 按钮后 ≤375px 溢出）。留档 Minor：手机端失去批量设类型入口（用户明确取舍）、compact 下回调为死参数 | **1160419 + 5a6006f** | ✅ Approved（窄屏溢出 Important 已回环） | **133/133** |

期间文档提交：1365cf4（使用说明产出）、2827444、8f1dacc、9cf64d2（各批次说明同步）。

### 10.2 本轮关键实现决策（接手 AI 必读）

- **公共牌提交语义**：一条街=3/4/5张，选满即自动提交；已提交牌点击=取消并同步缩减 state（calc.js:37 对 hand≠2 置 result=null 兜底）；board 1-2 张为合法中间态（streetOf 记翻前）
- **底池表单**：空输入=默认值（pot 0/call 0/myStack 100），placeholder 显示"默认 X"；非数字守卫保留 state 值；快捷档读闭包生效值（cur）非显示框；对手筹码已删（对手默认筹码充足，effectiveStack=min(my,opp)=my）
- **对手类型**：`type:null`=「默认」（灰徽章），所有读取点 `TYPE_DEFAULTS[o.type] ?? TAG` 同对象兜底——**默认对手数学与原 TAG 完全一致**；抽屉仅点4类型快选才写 type；「一键全员预设」文案=「一键全员设为紧凶」
- **牌桌页**（src/ui/tablePage.js）：座位顺时针编号、英雄固定正下（seat 0）；`seatPositionName(off,N)`：off=英雄相对庄家顺时针偏移，0→BTN、1→SB、2→BB、≥3→positionsFor(N)[off-3]；单挑简化 off0→BTN/off1→SB；dealer/轮次为**模块级会话内存**（刷新重置，v1 规格裁量）；renderTableInto(container) 可内嵌任意容器（桌面中栏）也可被浮层包装（手机）；nextRound() 导出供手机快捷按钮
- **桌面端**：三栏 `1.1fr 1.5fr 1fr`（输入/结果+策略/历史），中栏底部内嵌牌桌（aspect-ratio 自适应）；顶栏「GTO图」「设置」全屏浮层（openFullScreen 共享 helper，.fs-overlay 类同时是键盘守卫标记）
- **SW 更新策略**（public/sw.js，CACHE='texas-web-v3'）：页面导航**网络优先**（部署后刷新即见新版），静态资源（hash 文件名）缓存优先，离线回退 index.html——**每次发布改内容仍应升版 CACHE**（触发旧缓存清理）
- **存量对手迁移（批次8）**：迁移语义=「只抹旧代码自动写的 TAG，尊重用户之后主动标的」——一次性（texas.migrations 标记）+ 随备份走（exportAll 打 oppDefaultsV2 标记，importAll 仅对无标记旧备份强制迁移）；数学零影响（TYPE_DEFAULTS[null] ?? TAG 同对象兜底）。**后续新迁移须追加标记键，不得整体覆盖 texas.migrations**
- **WASM 加载链（批次9）**：src/wasm/poker_core.js+wasm 为 em++ 产物（`npm run build:wasm`，一次性构建后入库，Actions 无需 emsdk）；pokerCore.js 用 `?url` 引入 wasm 并以 `locateFile` 传给胶水——**改引擎重编译后无需额外接线**（文件名不变，vite 自动发新 hash）。回归教训：凡「dev 正常、部署异常」先查产物资源是否齐全（`ls dist/assets/*.wasm`）
- **行动建议（批次10）**：`actionAdvice` 输入 `bb`（用户单位/1BB，与 calc.js BIG_BLIND=10 联动）——**金额一律用户单位**，BB 口径只出现在 amountNote 文案；面对下注的加注至=2×call+pot（pot 已含对方下注）；action.js 偏置 0.03 与引擎 0.02 不同是有意设计（分档更粗），勿「统一」；call=0 时引擎 requiredEquity=1，UI 以 `<1` 判定显示需胜率。留档 Minor：c-bet 卡（纹理口径）与横幅（胜率口径）可能同屏口径并存、effStack=0 显示怪异、翻前平跟恒 1BB
- **SW 缓存策略 v2（批次11）**：导航 `cache:'no-cache'` 击穿浏览器 HTTP 缓存（Pages max-age=600 的陈旧 index.html 曾把用户钉在旧版）+ 每次发布升 CACHE 版本 + 设置页关于行手更构建标记（批次N·日期）——**「用户说看不到新功能」先让他看设置页关于的批次号**；sw.js 自身更新仍可能延迟 ≤10 分钟（Pages 对 sw.js 同样 max-age=600，留观察项）。批次11 留档 Minor：空手数会话无删除入口（不渲染）、删除按钮 36px、confirm 纯文本无需转义、版本标记每批次手更

### 10.3 ✅ 暂停已解除——恢复步骤执行完毕（2026-09-22）

原暂停状态（批次 7 本地未推送）已按以下 3 步收尾，全部完成：
1. ✅ 使用说明.md 同步 Polish 轮内容：⑤底池行改"默认留空=采用默认值（placeholder 提示）"；③对手档案行补"新对手默认「默认」未标定，点卡片/座位标类型"；顺手修 FAQ"4 个底池数字"→"3 个"（对手筹码字段批次 4 已删的遗留不一致）
2. ✅ `git push`（9cf64d2..bedeef3：da81b4b + §十文档提交 bedeef3 前身 68ff06f + 使用说明提交 bedeef3）→ Actions 自动部署
3. ✅ 验证部署：Actions conclusion=success；线上 `/`、`/sw.js`、`/manifest.webmanifest` 均 200

**新发现的留档 Minor：** 批次 7 改了应用内容但 sw.js CACHE 未升版（仍 `texas-web-v2`）——不影响内容正确性（导航网络优先+资源 hash 文件名），仅旧缓存条目不清理；下次改 SW 时顺手升到 v3 即可。

### 10.4 留档 Minor 池（本轮累计，用户反馈时按需修，均为不阻塞项）

- **输入/表单**：会话内重渲后底池输入框显示空但 state 保留已输值（placeholder 语义与生效值可能矛盾，纯展示误导）；花色快捷键仅 `1`=♠ 有效（2/3/4 被 rank 键遮蔽，存量设计）；pot=0 时快捷档算出 0（合法自洽）
- **牌桌页**：庄位/轮次刷新重置（v1 会话内存规格）；浮层打开不先 syncOpponents（对手数与人数不一致时座位显示兜底名）；抽屉编辑后座位菜单对象引用陈旧（按 id 落盘正确，仅显示）；中栏 <560px 且 9 人时边缘座位可能视觉重叠（真机走查观察）；手机「⏭ 下一轮」双重渲染（纯性能，无可见副作用）
- **桌面**：顶栏「GTO图」「设置」按钮 36px<44px 触控标准（鼠标无感）
- **PWA**：display:fullscreen 真机返回手势体验待验；图标无 purpose:maskable（Android 留白）；SW 离线首访依赖曾在线打开过
- （第五轮及之前的全部 Minor 留档见 §8.4 与 progress.md，终审已逐条裁量）

### 10.5 待办总览（合并 §五 上线后迭代节）

1. ✅ Polish 轮收尾 3 步（§10.3，2026-09-22 完成）
2. ⬜ 真机验收（§8.2 清单：功能/性能/兼容/离线/合规，含 F12 四视口）
3. ⬜ 用户后续新反馈（本轮节奏：反馈→批次实现+审查→推送部署→文档同步）
4. ⬜ 候选功能方向：庄位/轮次持久化、对手观察值一键修正、历史页导出表格化等（用户提出再排期）
