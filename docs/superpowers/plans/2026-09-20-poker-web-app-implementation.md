# 德扑助手 v4.0 网页版 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已批准的 v4.0 设计（`docs/superpowers/specs/2026-09-20-poker-web-app-design.md`）落地为可部署的手机网页版德扑策略助手。

**Architecture:** 四层架构——UI（原生JS）→ 策略层（JS纯函数）→ 引擎层（C++17 编译 WASM）→ 数据层（localStorage）。现有 `poker_assist/core/` 的 card/deck/evaluator 原样复用，新增 range（169格加权采样）与 equity_v2（范围化蒙特卡洛）。

**Tech Stack:** Vite 5 + 原生 JS/CSS（零运行时依赖）、Emscripten（embind）、Vitest + happy-dom、GitHub Pages。

## Global Constraints

- 全部 UI 文案为**简体中文**；产品定位文案必须是"学习与训练工具"+ "理性游戏"提示（设计§2定位声明、§13合规）。
- **零运行时 npm 依赖**；dev 依赖仅：vite、vitest、happy-dom。
- 性能预算（设计§13）：桌面 <100ms / 手机 <300ms（2000次×2对手范围模拟）；GTO页切换 <50ms。
- 触控目标 ≥44px；深色设计令牌以 `--bg:#0d1117 --bg-card:#161b22 --accent:#22c55e --danger:#f85149` 为锚。
- 浏览器目标：iOS Safari 16+ / Android Chrome 110+；320px~1920px 无布局破损。
- Node ≥18；Emscripten latest（Task 3 安装）。
- **每个任务结束时必须更新 `CLAUDE.md`**（勾选§五待办或在§四追加一行完成记录）——这是用户的硬性要求（CLAUDE.md 决策5）。
- git 仓库根为 `Texas/`；提交信息用 conventional commits（feat/test/chore/docs）。
- 卡牌记法 `"As","Kh","Td"`（rank: A K Q J T 9 8 7 6 5 4 3 2；suit: s h d c）。

## 全局数据约定（所有任务共同遵守，防止索引错位）

1. **169格手牌类索引**（C++ 与 JS 一致）：rank 序号 A=0,K=1,Q=2,J=3,T=4,9=5,8=6,7=6+1=7,6=8,5=9,4=10,3=11,2=12。
   - 口袋对：`idx = r*13 + r`（13个）；同花：`idx = hi*13 + lo`（hi>lo，**矩阵上三角**）；异花：`idx = lo*13 + hi`（**矩阵下三角**）。
   - 组合数：对子6、同花4、异花12；总 1326。
2. **GTO 图表网格**：`string[13]`，`grid[row][col]`；row=高牌序号，col=低牌序号；`col>row` 格=同花、`col<row` 格=异花、`col==row`=对子。动作字符：`R`=加注/推、`r`=混合偏加注、`C`=跟注、`c`=混合偏跟注、`F`=弃牌。Nash 表只有 R/F。
3. **52张牌位图**：`cardIdx = (rank-2)*4 + suit`（rank 用 C++ Card 枚举值 2..14）。
4. **有效胜率**（JS 侧）：`effectiveEquity = winRate + tieRate*0.5`（引擎分开返回三项，和为1）。

---

# 阶段0：基础设施

### Task 1: git 仓库初始化

**Files:**
- Create: `.gitignore`

**Interfaces:**
- Produces: 可提交的 git 仓库（后续所有任务的 commit 前提）

- [ ] **Step 1: 写 `.gitignore`**

```gitignore
node_modules/
dist/
.omc/
.superpowers/
.engine-test/
poker_assist/CMakeFiles/
poker_assist/CMakeCache.txt
poker_assist/build.ninja
poker_assist/.ninja_*
poker_assist/cmake_install.cmake
poker_assist/*.exe
poker_assist/*.obj
```

- [ ] **Step 2: 初始化并首次提交**

```bash
cd /c/Users/36327/Desktop/Texas
git init -b main
git add .gitignore CLAUDE.md docs/ poker_assist/core/ poker_assist/ui/ poker_assist/main.cpp poker_assist/README.md poker_assist/CMakeLists.txt
git commit -m "chore: init repo with design docs and windows console source"
```

Expected: `main` 分支创建，首次提交成功。

---

### Task 2: Vite 项目骨架 + Vitest 跑通

**Files:**
- Create: `texas-web/package.json`, `texas-web/vite.config.js`, `texas-web/vitest.config.js`, `texas-web/index.html`, `texas-web/src/main.js`, `texas-web/src/strategy/_smoke.test.js`

**Interfaces:**
- Produces: `npm run dev` / `npm run test` 可用的工程骨架；后续所有 JS 模块挂在 `texas-web/src/` 下

- [ ] **Step 1: 建工程文件**

`texas-web/package.json`：
```json
{
  "name": "texas-web",
  "private": true,
  "version": "4.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

`texas-web/vite.config.js`：
```js
import { defineConfig } from 'vite';
export default defineConfig({ base: './', server: { port: 5173 } });
```

`texas-web/vitest.config.js`：
```js
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'happy-dom' } });
```

`texas-web/index.html`：
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>德扑助手 · 学习训练工具</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

`texas-web/src/main.js`：
```js
document.getElementById('app').textContent = '德扑助手加载中…';
```

- [ ] **Step 2: 安装 dev 依赖**

```bash
cd /c/Users/36327/Desktop/Texas/texas-web
npm install -D vite vitest happy-dom
```

- [ ] **Step 3: 写冒烟测试** `src/strategy/_smoke.test.js`

```js
import { describe, it, expect } from 'vitest';
describe('工程骨架', () => { it('vitest 可运行', () => { expect(1 + 1).toBe(2); }); });
```

- [ ] **Step 4: 跑测试**

Run: `npm run test`
Expected: `1 passed`

- [ ] **Step 5: Commit**

```bash
cd /c/Users/36327/Desktop/Texas
git add texas-web
git commit -m "chore: scaffold vite+vitest project shell"
```
并更新 CLAUDE.md §五 第8条为进行中状态，一并提交。

---

### Task 3: Emscripten 工具链 + WASM 构建管线跑通

**Files:**
- Create: `texas-web/core/`（从 `poker_assist/core/` 复制 `card.h/cpp`、`deck.h/cpp`、`evaluator.h/cpp`）、`texas-web/wasm/bindings.cpp`、`texas-web/src/wasm/pokerCore.js`（loader）

**Interfaces:**
- Produces: `npm run build:wasm` 产出 `src/wasm/poker_core.js/.wasm`；`npm run test:engine` 跑 C++ 基准；JS 侧统一入口 `src/wasm/pokerCore.js` 的 `getCore(): Promise<object>`

> 注：不复制 `calculator.cpp/h`——v1 的 `int wins += 0.5` 存在平局截断缺陷，v2 在 `equity_v2.cpp` 中以 double 重新实现同套公式（Task 6/7），设计§3.2"calculator 现有"由 equity_v2 取代。此偏离需记录到 CLAUDE.md。

- [ ] **Step 1: 安装 emsdk（一次性）**

```bash
cd /c && git clone https://github.com/emscripten-core/emsdk.git
cd emsdk && ./emsdk install latest && ./emsdk activate latest
source emsdk_env.sh && emcc --version
```
Expected: `emcc (Emscripten gcc/clang-like replacement) ...`。之后每个新终端需先 `source /c/emsdk/emsdk_env.sh`。

- [ ] **Step 2: 复制核心源码**

```bash
cd /c/Users/36327/Desktop/Texas
mkdir -p texas-web/core texas-web/wasm texas-web/src/wasm texas-web/tests
cp poker_assist/core/card.h poker_assist/core/card.cpp poker_assist/core/deck.h poker_assist/core/deck.cpp poker_assist/core/evaluator.h poker_assist/core/evaluator.cpp texas-web/core/
```

- [ ] **Step 3: 写最小绑定** `texas-web/wasm/bindings.cpp`

```cpp
#include <emscripten/bind.h>
#include <string>
#include <vector>
using namespace emscripten;

int ping() { return 42; }
EMSCRIPTEN_BINDINGS(poker_core) { function("ping", &ping); }
```

- [ ] **Step 4: 写 JS loader** `texas-web/src/wasm/pokerCore.js`

```js
let corePromise = null;
export function getCore() {
  if (!corePromise) {
    corePromise = import('./poker_core.js').then(m => m.default.createPokerCore());
  }
  return corePromise;
}
```

- [ ] **Step 5: 加 npm scripts**（编辑 `texas-web/package.json` 的 scripts 块）

```json
"build:wasm": "em++ -O3 --std=c++17 --bind -s MODULARIZE=1 -s EXPORT_NAME=createPokerCore -s ALLOW_MEMORY_GROWTH=1 -s ENVIRONMENT=web core/card.cpp core/deck.cpp core/evaluator.cpp wasm/bindings.cpp -o src/wasm/poker_core.js",
"test:engine": "em++ -O1 --std=c++17 -s ENVIRONMENT=node -s EXIT_RUNTIME=1 tests/engine_test.cpp core/card.cpp core/deck.cpp core/evaluator.cpp core/range.cpp core/equity_v2.cpp -o .engine-test/engine_test.js && node .engine-test/engine_test.js"
```
（Task 4 起才有 range.cpp/equity_v2.cpp/engine_test.cpp；本任务先用临时命令验证管线：）

```bash
cd /c/Users/36327/Desktop/Texas/texas-web && source /c/emsdk/emsdk_env.sh
em++ -O1 --std=c++17 --bind -s MODULARIZE=1 -s EXPORT_NAME=createPokerCore -s ENVIRONMENT=node core/card.cpp core/deck.cpp core/evaluator.cpp wasm/bindings.cpp -o .engine-test/ping.js
node -e "require('./.engine-test/ping.js')().then(m=>console.log('ping=',m.ping()))"
```
Expected: `ping= 42`

- [ ] **Step 6: Commit**

```bash
cd /c/Users/36327/Desktop/Texas
git add texas-web && git commit -m "chore: emscripten toolchain pipeline with ping binding"
```
更新 CLAUDE.md 一并提交。

---

# 阶段A：引擎层（C++ → WASM）

### Task 4: HandRange 静态部分（169格类/名称/组合数）

**Files:**
- Create: `texas-web/core/range.h`, `texas-web/core/range.cpp`
- Test: `texas-web/tests/engine_test.cpp`（新建，本任务先放静态部分用例）

**Interfaces:**
- Produces（后续任务依赖的精确签名）:
```cpp
class HandRange {
public:
  static constexpr int NUM_CLASSES = 169;
  static int classIndex(int hi, int lo, bool suited);   // hi>=lo 序号(0=A)；见全局约定1
  static const char* className(int idx);                // "AA".."AKs".."AKo".."32o"
  static int combosOfClass(int idx);                    // 6/4/12
  static void classRanks(int idx, int& hi, int& lo, bool& suited);
  HandRange();                                          // 全部权重=100
  void setWeight(int idx, uint8_t w);                   // 0-100
  uint8_t weight(int idx) const;
};
```

- [ ] **Step 1: 写失败测试**（`texas-web/tests/engine_test.cpp`，测试宏版式后续任务复用）

```cpp
#include <cassert>
#include <cstdio>
#include <string>
#include "range.h"
#define CHECK(cond) do{ if(!(cond)){ printf("FAIL %s:%d: %s\n",__FILE__,__LINE__,#cond); fails++; } }while(0)
int fails = 0;
static void testRangeStatic() {
  CHECK(HandRange::classIndex(0,0,true) == 0);            // AA
  CHECK(HandRange::classIndex(0,1,true) == 1);            // AKs
  CHECK(HandRange::classIndex(1,0,false) == 13);          // AKo -> lo*13+hi = 1*13+0
  CHECK(std::string(HandRange::className(0)) == "AA");
  CHECK(std::string(HandRange::className(1)) == "AKs");
  CHECK(std::string(HandRange::className(13)) == "AKo");
  CHECK(std::string(HandRange::className(168)) == "32o");
  CHECK(HandRange::combosOfClass(0) == 6);
  CHECK(HandRange::combosOfClass(1) == 4);
  CHECK(HandRange::combosOfClass(13) == 12);
  int hi,lo; bool s;
  HandRange::classRanks(1, hi, lo, s); CHECK(hi==0 && lo==1 && s);
  HandRange::classRanks(13, hi, lo, s); CHECK(hi==0 && lo==1 && !s);
  HandRange r; // 默认全100
  int total = 0;
  for (int i=0;i<169;i++){ total += r.weight(i)*HandRange::combosOfClass(i)/100; }
  CHECK(total == 1326);
  r.setWeight(0, 0);
  CHECK(r.weight(0) == 0);
}
int main(){ testRangeStatic(); printf(fails? "FAILED %d\n":"ALL PASS\n", fails); return fails?1:0; }
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd texas-web && source /c/emsdk/emsdk_env.sh && em++ -O1 --std=c++17 -s ENVIRONMENT=node -s EXIT_RUNTIME=1 tests/engine_test.cpp core/range.cpp core/card.cpp core/deck.cpp core/evaluator.cpp -o .engine-test/engine_test.js && node .engine-test/engine_test.js`
Expected: 编译失败（range.h 不存在）

- [ ] **Step 3: 实现** `texas-web/core/range.h`

```cpp
#ifndef RANGE_H
#define RANGE_H
#include <cstdint>

// 169格手牌范围：对角线=口袋对(6组合)，上三角=同花(4)，下三角=异花(12)，共1326组合
class HandRange {
public:
    static constexpr int NUM_CLASSES = 169;
    static int classIndex(int hi, int lo, bool suited);
    static const char* className(int idx);
    static int combosOfClass(int idx);
    static void classRanks(int idx, int& hi, int& lo, bool& suited);

    HandRange();
    void setWeight(int idx, uint8_t w);
    uint8_t weight(int idx) const;

private:
    uint8_t weights_[NUM_CLASSES];
};
#endif
```

`texas-web/core/range.cpp`：

```cpp
#include "range.h"
#include <cstdio>

static const char* RANKS = "AKQJT98765432";

int HandRange::classIndex(int hi, int lo, bool suited) {
    if (hi == lo) return hi * 13 + hi;
    return suited ? hi * 13 + lo : lo * 13 + hi;
}

void HandRange::classRanks(int idx, int& hi, int& lo, bool& suited) {
    int r = idx / 13, c = idx % 13;
    if (r == c) { hi = lo = r; suited = false; }
    else if (c > r) { hi = r; lo = c; suited = true; }
    else { hi = c; lo = r; suited = false; }
}

const char* HandRange::className(int idx) {
    static char buf[4];
    int hi, lo; bool s;
    classRanks(idx, hi, lo, s);
    buf[0] = RANKS[hi]; buf[1] = RANKS[lo]; buf[2] = s ? 's' : 'o'; buf[3] = '\0';
    return buf;
}

int HandRange::combosOfClass(int idx) {
    int hi, lo; bool s; classRanks(idx, hi, lo, s);
    if (hi == lo) return 6;
    return s ? 4 : 12;
}

HandRange::HandRange() { for (int i = 0; i < NUM_CLASSES; ++i) weights_[i] = 100; }
void HandRange::setWeight(int idx, uint8_t w) { weights_[idx] = w; }
uint8_t HandRange::weight(int idx) const { return weights_[idx]; }
```

- [ ] **Step 4: 跑测试确认通过**

Run: 同 Step 2
Expected: `ALL PASS`

- [ ] **Step 5: Commit**

```bash
cd /c/Users/36327/Desktop/Texas && git add texas-web && git commit -m "feat(core): HandRange 169-class static model"
```
更新 CLAUDE.md 并提交。

---

### Task 5: HandRange 加权采样（占用避让 + 重采样）

**Files:**
- Modify: `texas-web/core/range.h`, `texas-web/core/range.cpp`
- Test: `texas-web/tests/engine_test.cpp`（追加用例）

**Interfaces:**
- Consumes: Task 4 的 HandRange
- Produces:
```cpp
  // 在 used[52] 位图之外，按权重采样一手牌；成功返回true并写出两张牌
  bool sample(std::mt19937& rng, const bool used[52], Card out[2]) const;
  // 范围内未被占用的组合总数
  int liveCombos(const bool used[52]) const;
  static int cardIdx(const Card& c);   // (rank-2)*4+suit
```

- [ ] **Step 1: 追加失败测试**

```cpp
// 追加到 engine_test.cpp（main 前声明、main 内调用）
static void testRangeSample() {
  std::mt19937 rng(12345);
  // 1) 全100权重 ≈ 均匀：抽10000手，AA出现频率 ≈ 6/1326 = 0.45%，容差±0.15%
  HandRange full; bool used[52] = {false};
  int aaCount = 0;
  for (int i = 0; i < 10000; i++) {
    Card c[2]; CHECK(full.sample(rng, used, c));
    int hi, lo; bool s; HandRange::classRanks(HandRange::classIndex(
      /*AA idx=0*/ 0,0,true), hi, lo, s);
    // 用类名比较更直接：
    std::string n1 = HandRange::className(0);
    int idxAA = HandRange::classIndex(0, 0, true);
    // 反查：由两张牌求类
    auto idxOf = [](const Card& a, const Card& b) {
      int ra = a.getRank(), rb = b.getRank();
      int hi = ra > rb ? ra : rb, lo = ra > rb ? rb : ra;
      return HandRange::classIndex(hi-2, lo-2, a.getSuit() == b.getSuit());
    };
    if (idxOf(c[0], c[1]) == idxAA) aaCount++;
  }
  double freq = aaCount / 10000.0;
  CHECK(freq > 0.0030 && freq < 0.0060);

  // 2) 单一类权重：只留AKs（4组合）必须100%抽到AKs
  HandRange onlyAKs; 
  for (int i = 0; i < 169; i++) onlyAKs.setWeight(i, i == 1 ? 100 : 0);
  for (int i = 0; i < 500; i++) {
    Card c[2]; CHECK(onlyAKs.sample(rng, used, c));
    CHECK(c[0].getRank() == Card::ACE && c[1].getRank() == Card::KING);
    CHECK(c[0].getSuit() == c[1].getSuit());
  }

  // 3) 占用避让：拿走A♠K♠后，AKs仍能抽到（剩余3组合）
  bool used2[52] = {false};
  Card as("As"), ks("Ks");
  used2[HandRange::cardIdx(as)] = true; used2[HandRange::cardIdx(ks)] = true;
  for (int i = 0; i < 100; i++) {
    Card c[2]; CHECK(onlyAKs.sample(rng, used2, c));
    CHECK(!(c[0].getSuit()==Card::SPADES && c[1].getSuit()==Card::SPADES));
  }

  // 4) 全占用失败：拿走A*K*全部16张后 AKo+AKs 均无组合 → sample返回false
  bool used3[52] = {false};
  for (int s = 0; s < 4; s++) {
    Card a((std::string("A") + "shdc"[s])); Card k((std::string("K") + "shdc"[s]));
    used3[HandRange::cardIdx(a)] = true; used3[HandRange::cardIdx(k)] = true;
  }
  Card c[2];
  CHECK(!onlyAKs.sample(rng, used3, c));
  CHECK(onlyAKs.liveCombos(used3) == 0);

  // 5) liveCombos 全范围占用hero牌后 = 1326 - 91(与hero共用一张的类组合) —— 仅验已知简单例：
  bool used4[52] = {false};
  used4[HandRange::cardIdx(Card("As"))] = true;
  // A类相关组合：AA剩3对组合(3)、每个As×k(12个异花类各1... 简化：直接验证总数公式
  CHECK(full.liveCombos(used4) == 1326 - (6-3) /*AA少3*/ - 12/*含As的12个异花类各少1*/ - 3/*含As的3个同花类各少1*/);
}
```
并在 `main()` 中加 `testRangeSample();`。同时 `range.h` 需 `#include "card.h"` 与 `<random>`。

- [ ] **Step 2: 跑测试确认失败**（同 Task 4 命令）
Expected: 编译失败（sample 未声明）

- [ ] **Step 3: 实现采样**（`range.h` 追加声明；`range.cpp` 追加实现）

range.h 追加：
```cpp
#include "card.h"
#include <random>
    // ...类内追加：
    bool sample(std::mt19937& rng, const bool used[52], Card out[2]) const;
    int liveCombos(const bool used[52]) const;
    static int cardIdx(const Card& c);
```

range.cpp 追加：
```cpp
#include <vector>
#include <algorithm>

int HandRange::cardIdx(const Card& c) { return (c.getRank() - 2) * 4 + c.getSuit(); }

// 枚举某类中未被占用的具体组合
static void freeCombos(int idx, const bool used[52], std::vector<std::pair<int,int>>& out) {
    int hi, lo; bool s; HandRange::classRanks(idx, hi, lo, s);
    auto mk = [&](int r1, int s1, int r2, int s2) {
        Card a((unsigned char)s1, (Card::Rank)r1); // 见下方说明：使用构造或改用Deck的牌
        // 直接构造卡片：Card(Suit, Rank)
    };
    if (hi == lo) {
        for (int s1 = 0; s1 < 4; s1++) for (int s2 = s1+1; s2 < 4; s2++) {
            Card a((Card::Suit)s1, (Card::Rank)(hi+2));
            Card b((Card::Suit)s2, (Card::Rank)(hi+2));
            if (!used[HandRange::cardIdx(a)] && !used[HandRange::cardIdx(b)])
                out.push_back({HandRange::cardIdx(a), HandRange::cardIdx(b)});
        }
    } else if (s) {
        for (int k = 0; k < 4; k++) {
            Card a((Card::Suit)k, (Card::Rank)(hi+2));
            Card b((Card::Suit)k, (Card::Rank)(lo+2));
            if (!used[HandRange::cardIdx(a)] && !used[HandRange::cardIdx(b)])
                out.push_back({HandRange::cardIdx(a), HandRange::cardIdx(b)});
        }
    } else {
        for (int s1 = 0; s1 < 4; s1++) for (int s2 = 0; s2 < 4; s2++) {
            if (s1 == s2) continue;
            Card a((Card::Suit)s1, (Card::Rank)(hi+2));
            Card b((Card::Suit)s2, (Card::Rank)(lo+2));
            if (!used[HandRange::cardIdx(a)] && !used[HandRange::cardIdx(b)])
                out.push_back({HandRange::cardIdx(a), HandRange::cardIdx(b)});
        }
    }
}

int HandRange::liveCombos(const bool used[52]) const {
    int total = 0;
    std::vector<std::pair<int,int>> tmp;
    for (int i = 0; i < NUM_CLASSES; i++) {
        if (weights_[i] == 0) continue;
        tmp.clear();
        freeCombos(i, used, tmp);
        total += (int)tmp.size();
    }
    return total;
}

bool HandRange::sample(std::mt19937& rng, const bool used[52], Card out[2]) const {
    // 按权重建累积表（O(169)）
    int cum[NUM_CLASSES]; int acc = 0;
    for (int i = 0; i < NUM_CLASSES; i++) { acc += weights_[i]; cum[i] = acc; }
    if (acc == 0) return false;
    std::uniform_int_distribution<int> pickW(1, acc);

    for (int attempt = 0; attempt < 64; attempt++) {
        int w = pickW(rng);
        int idx = (int)(std::lower_bound(cum, cum + NUM_CLASSES, w) - cum);
        std::vector<std::pair<int,int>> free;
        freeCombos(idx, used, free);
        if (free.empty()) continue;                 // 组合全被占用→按权重重采样
        std::uniform_int_distribution<size_t> pick(0, free.size()-1);
        auto& p = free[pick(rng)];
        Card a((Card::Suit)(p.first % 4), (Card::Rank)(p.first / 4 + 2));
        Card b((Card::Suit)(p.second % 4), (Card::Rank)(p.second / 4 + 2));
        out[0] = a; out[1] = b;
        return true;
    }
    // 兜底：64次未命中（极小范围被严重占用）→ 在全部剩余组合中均匀挑一个
    std::vector<std::pair<int,int>> all;
    for (int i = 0; i < NUM_CLASSES; i++) {
        if (weights_[i] == 0) continue;
        freeCombos(i, used, all);
    }
    if (all.empty()) return false;
    std::uniform_int_distribution<size_t> pickAll(0, all.size()-1);
    auto& p = all[pickAll(rng)];
    Card a((Card::Suit)(p.first % 4), (Card::Rank)(p.first / 4 + 2));
    Card b((Card::Suit)(p.second % 4), (Card::Rank)(p.second / 4 + 2));
    out[0] = a; out[1] = b;
    return true;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: 同 Task 4 命令（engine_test 现在链接 range.cpp 已就位）
Expected: `ALL PASS`

- [ ] **Step 5: Commit**

```bash
git add texas-web && git commit -m "feat(core): weighted range sampling with occupancy avoidance"
```
更新 CLAUDE.md 并提交。

---

### Task 6: calculateEquityV2 + 范围透视 + embind + 引擎基准

**Files:**
- Create: `texas-web/core/equity_v2.h`, `texas-web/core/equity_v2.cpp`
- Modify: `texas-web/wasm/bindings.cpp`, `texas-web/tests/engine_test.cpp`

**Interfaces:**
- Consumes: Task 5 `HandRange::sample/liveCombos/cardIdx`；`HandEvaluator::evaluateHand(hand, board)→int`（分高者胜）
- Produces（C++/JS 边界，与设计§3.3一致）:
```cpp
struct RangeStatsV2 { int totalCombos; double beatPct, tiePct, losePct; std::vector<std::string> dangerHands; };
struct EquityV2Result { double winRate, tieRate, lossRate; int simulations; RangeStatsV2 rangeStats; };
// opponentMasks[k] = 169个0-100权重；范围透视按实际采样到的类统计（样本≥5才参与danger排名）
EquityV2Result calculateEquityV2(const std::vector<std::string>& heroHand,
                                 const std::vector<std::string>& board,
                                 const std::vector<std::vector<uint8_t>>& opponentMasks,
                                 int iterations);
```

- [ ] **Step 1: 追加失败基准测试**

```cpp
#include "equity_v2.h"
static std::vector<std::vector<uint8_t>> uniformMask() {
  return { std::vector<uint8_t>(169, 100) };
}
static void testEquityV2() {
  // 基准1：皇家同花顺在公共牌 T-J-Q 同花 s 上 vs 任意范围 = 100% 胜
  { // 直接构造：hero=AKs的两个具体组合, board 补满时皇家已成立
    auto r = calculateEquityV2({"As","Ks"}, {"Ts","Js","Qs","2h","3d"}, uniformMask(), 500);
    CHECK(r.winRate == 1.0);
  }
  // 基准2：AA vs 1个均匀随机 ≈ 85%±1  → 折算 effective = win + tie/2 ∈ [84,86]
  { auto r = calculateEquityV2({"As","Ad"}, {}, uniformMask(), 5000);
    double eff = r.winRate + r.tieRate * 0.5;
    CHECK(eff > 0.83 && eff < 0.87); }
  // 基准3：AA vs 前10%范围 ≈ 82%±2
  { std::vector<uint8_t> top10(169, 0);
    // 前10% ≈ 前132组合：用类序表前22类（对子+大张组合近似；实现期以rankTable校准）
    // 这里直接用权重序：排前的22类（AA..88,AKs..A9s,AKo..AJo,KQs,KJs? 简化：显式列前132组合的类）
    int need = 132; // 组合数
    // 从大到小枚举类（用类强度近似顺序：先对子从大到小，再同花，再异花）
    int order[169]; int n=0;
    for (int hi=0; hi<13; hi++) for (int lo=hi; lo<13; lo++) order[n++] = HandRange::classIndex(hi,lo,true);
    for (int hi=0; hi<13; hi++) for (int lo=hi+1; lo<13; lo++) order[n++] = HandRange::classIndex(hi,lo,false);
    // 简化排序键：对子优先级由 hi 决定 → 需要真正排序，这里用简单冒泡按 (pairRank desc, suited first) 
    // 为测试稳定，改为显式挑前22个类：
    const char* top22[] = {"AA","KK","QQ","JJ","TT","99","88","77","AKs","AQs","AJs","ATs","AKo","AQo","A9s","AJo","KQs","KJs","KQo","A8s","K9s","QJs"};
    std::vector<uint8_t> m(169, 0);
    for (auto* name : top22) {
      for (int i = 0; i < 169; i++)
        if (std::string(HandRange::className(i)) == name) m[i] = 100;
    }
    auto r = calculateEquityV2({"As","Ad"}, {}, {m}, 5000);
    double eff = r.winRate + r.tieRate * 0.5;
    CHECK(eff > 0.80 && eff < 0.84); }
  // 基准4：重复模拟稳定性：两次2000次差异 <2%
  { auto a = calculateEquityV2({"As","Ks"}, {}, uniformMask(), 2000);
    auto b = calculateEquityV2({"As","Ks"}, {}, uniformMask(), 2000);
    CHECK(std::abs(a.winRate - b.winRate) < 0.02); }
  // 基准5：范围透视 totalCombos：全范围未占用=1326（1对手时每迭代一致，取整字段）
  { auto r = calculateEquityV2({"As","Ad"}, {}, uniformMask(), 100);
    CHECK(r.rangeStats.totalCombos == 1326 - 51); // 去掉含A♠或A♦的组合：AA少3+12异花+3同花=... 精确: 1326-3-12-3 = 1308
    CHECK(r.rangeStats.totalCombos == 1308); }
  // 基准6：72o vs 1随机 ≈ 35%±2（v3.0基准保持）
  { auto r = calculateEquityV2({"7c","2d"}, {}, uniformMask(), 5000);
    double eff = r.winRate + r.tieRate * 0.5;
    CHECK(eff > 0.33 && eff < 0.37); }
}
```
main 中调用。注意：基准5的期望值推导——占用 A♠A♦ 后：AA 剩 C(2,2)... 4组合中含这两张的5对组合里去掉3个；含A♠的异花12类各去掉1组合、含A♠的同花3类各去掉1。合计 1326-3-12-3=1308。

- [ ] **Step 2: 跑测试确认失败**（equity_v2.h 不存在，编译失败）

- [ ] **Step 3: 实现** `texas-web/core/equity_v2.h/.cpp`

equity_v2.h：
```cpp
#ifndef EQUITY_V2_H
#define EQUITY_V2_H
#include <string>
#include <vector>
#include <cstdint>

struct RangeStatsV2 {
    int totalCombos = 0;
    double beatPct = 0, tiePct = 0, losePct = 0;
    std::vector<std::string> dangerHands;
};

struct EquityV2Result {
    double winRate = 0, tieRate = 0, lossRate = 0;
    int simulations = 0;
    RangeStatsV2 rangeStats;
};

EquityV2Result calculateEquityV2(const std::vector<std::string>& heroHand,
                                 const std::vector<std::string>& board,
                                 const std::vector<std::vector<uint8_t>>& opponentMasks,
                                 int iterations);
#endif
```

equity_v2.cpp：
```cpp
#include "equity_v2.h"
#include "range.h"
#include "card.h"
#include "evaluator.h"
#include "deck.h"
#include <random>
#include <chrono>
#include <map>
#include <algorithm>

EquityV2Result calculateEquityV2(const std::vector<std::string>& heroHand,
                                 const std::vector<std::string>& board,
                                 const std::vector<std::vector<uint8_t>>& opponentMasks,
                                 int iterations) {
    EquityV2Result result;
    result.simulations = iterations;
    int nOpp = (int)opponentMasks.size();
    if (heroHand.size() != 2 || nOpp == 0 || iterations <= 0) return result;

    std::vector<Card> hero, community;
    for (auto& s : heroHand) hero.push_back(Card::fromNotation(s));
    for (auto& s : board) community.push_back(Card::fromNotation(s));

    bool used[52] = {false};
    for (auto& c : hero) used[HandRange::cardIdx(c)] = true;
    for (auto& c : community) used[HandRange::cardIdx(c)] = true;

    std::vector<HandRange> ranges;
    for (auto& m : opponentMasks) {
        HandRange r;
        for (int i = 0; i < HandRange::NUM_CLASSES && i < (int)m.size(); i++)
            r.setWeight(i, m[i]);
        ranges.push_back(r);
    }

    std::mt19937 rng((unsigned)std::chrono::steady_clock::now().time_since_epoch().count());

    double wins = 0, ties = 0;                       // ★ double：修v1平局截断缺陷
    double beat = 0, tie = 0, lose = 0;              // 逐对手范围透视计数
    std::map<int, std::pair<int,int>> classWL;       // 类idx -> {样本数, 胜次数}（每对手合并）

    std::vector<Card> fullBoard;
    std::vector<Card> oppHands(2);
    for (int it = 0; it < iterations; it++) {
        bool iterUsed[52]; std::copy(used, used+52, iterUsed);
        std::vector<std::vector<Card>> opps(nOpp, std::vector<Card>(2));
        bool ok = true;
        for (int k = 0; k < nOpp && ok; k++) {
            Card c[2];
            if (!ranges[k].sample(rng, iterUsed, c)) { ok = false; break; }
            opps[k][0] = c[0]; opps[k][1] = c[1];
            iterUsed[HandRange::cardIdx(c[0])] = true;
            iterUsed[HandRange::cardIdx(c[1])] = true;
        }
        if (!ok) continue;
        fullBoard = community;
        Deck deck(rng());
        for (int i = 0; i < 52; i++) if (iterUsed[i]) {
            int r = i / 4 + 2, s = i % 4;
            deck.removeCard(Card((Card::Suit)s, (Card::Rank)r));
        }
        while (fullBoard.size() < 5) fullBoard.push_back(deck.drawCard());

        int heroScore = HandEvaluator::evaluateHand(hero, fullBoard);
        bool beaten = false, tied = false;
        for (int k = 0; k < nOpp; k++) {
            int oppScore = HandEvaluator::evaluateHand(opps[k], fullBoard);
            bool thisWin = heroScore > oppScore;
            if (oppScore > heroScore) beaten = true;
            else if (oppScore == heroScore) tied = true;
            // 透视统计
            int idx = HandRange::classIndex(std::max(opps[k][0].getRank(), opps[k][1].getRank()) - 2,
                                            std::min(opps[k][0].getRank(), opps[k][1].getRank()) - 2,
                                            opps[k][0].getSuit() == opps[k][1].getSuit());
            auto& e = classWL[idx];
            if (thisWin) { beat += 1.0 / nOpp; e.second += 1; }
            else if (oppScore == heroScore) { tie += 1.0 / nOpp; }
            else { lose += 1.0 / nOpp; }
            e.first += 1;
        }
        if (beaten) loss;
        if (!beaten && !tied) wins += 1;
        else if (!beaten && tied) ties += 1;
    }

    result.winRate = wins / iterations;
    result.tieRate = ties / iterations;
    result.lossRate = 1.0 - result.winRate - result.tieRate;
    result.rangeStats.beatPct = beat / (iterations * nOpp) * 100;
    result.rangeStats.tiePct  = tie / (iterations * nOpp) * 100;
    result.rangeStats.losePct = lose / (iterations * nOpp) * 100;
    // totalCombos：以初始占用（hero+board）计算每对手活组合之和的平均
    double live = 0;
    bool baseUsed[52] = {false};
    for (auto& c : hero) baseUsed[HandRange::cardIdx(c)] = true;
    for (auto& c : community) baseUsed[HandRange::cardIdx(c)] = true;
    for (auto& r : ranges) live += r.liveCombos(baseUsed);
    result.rangeStats.totalCombos = (int)(live / nOpp + 0.5);

    // dangerHands：样本≥5的类中胜率最低的3个
    std::vector<std::pair<double,int>> ranked;
    for (auto& [idx, wl] : classWL) {
        if (wl.first >= 5) ranked.push_back({ (double)wl.second / wl.first, idx });
    }
    std::sort(ranked.begin(), ranked.end());
    for (size_t i = 0; i < ranked.size() && i < 3; i++)
        result.rangeStats.dangerHands.push_back(HandRange::className(ranked[i].second));
    return result;
}
```
（实现时若 `loss` 一行为占位符号需写成 `if (beaten) {}` 或删除——以编译通过且语义正确为准：beaten 时什么都不加，lossRate 用 1-win-tie 得出。）

- [ ] **Step 4: 更新 bindings.cpp**

```cpp
#include <emscripten/bind.h>
#include "equity_v2.h"
using namespace emscripten;

EMSCRIPTEN_BINDINGS(poker_core) {
  register_vector<std::string>("VectorString");
  register_vector<uint8_t>("VectorU8");
  register_vector<std::vector<uint8_t>>("VectorVectorU8");

  value_object<RangeStatsV2>("RangeStats")
    .field("totalCombos", &RangeStatsV2::totalCombos)
    .field("beatPct", &RangeStatsV2::beatPct)
    .field("tiePct", &RangeStatsV2::tiePct)
    .field("losePct", &RangeStatsV2::losePct)
    .field("dangerHands", &RangeStatsV2::dangerHands);

  value_object<EquityV2Result>("EquityV2Result")
    .field("winRate", &EquityV2Result::winRate)
    .field("tieRate", &EquityV2Result::tieRate)
    .field("lossRate", &EquityV2Result::lossRate)
    .field("simulations", &EquityV2Result::simulations)
    .field("rangeStats", &EquityV2Result::rangeStats);

  function("calculateEquityV2", &calculateEquityV2);
}
```

- [ ] **Step 5: 跑引擎基准**

Run: `npm run test:engine`
Expected: `ALL PASS`。若基准2/3/6超容差：先检查采样实现（重点：异花12组合枚举、重采样逻辑），再微调基准3的 top22 清单（以公开参考数据校准，设计§9.1）。

- [ ] **Step 6: 手机性能预检（桌面代理）**

```bash
node -e "
const m = require('./src/wasm/poker_core.js');
m().then(core => {
  const mask = Array.from({length:169}, () => 100);
  const t0 = Date.now();
  const r = core.calculateEquityV2(['As','Kd'], ['2h','7c','9d'], [mask, mask], 2000);
  console.log('2000次×2对手:', Date.now()-t0, 'ms  win=', r.winRate.toFixed(3));
});"
```
Expected: 桌面 Node 下 <200ms（预算300ms的粗校验）。

- [ ] **Step 7: Commit**

```bash
git add texas-web && git commit -m "feat(engine): calculateEquityV2 range monte-carlo with range stats + embind"
```
更新 CLAUDE.md 并提交。

---

### Task 7: evaluateDecision（风格参数化）+ 前端 WASM loader 集成

**Files:**
- Modify: `texas-web/core/equity_v2.h/.cpp`, `texas-web/wasm/bindings.cpp`, `texas-web/src/wasm/pokerCore.js`
- Test: `texas-web/tests/engine_test.cpp`（追加）

**Interfaces:**
- Produces:
```cpp
struct DecisionResult { double evCall, evRaise, potOdds, requiredEquity;
                        std::string advice, adviceLevel; };
// adviceStyle: "conservative"|"standard"|"aggressive"
// adviceLevel ∈ "raise"|"call"|"fold"|"neutral"（机器可读）；advice 为中文短句
DecisionResult evaluateDecision(double winRate, double pot, double call,
                                double raise, const std::string& adviceStyle);
```
公式沿用 v1 语义（poker_assist/core/calculator.cpp:106-134）：`evCall = winRate*pot - (1-winRate)*call`；`raiseEV` 按 50%跟/30%弃/20%再加模型；`potOdds = pot/call`；`requiredEquity = 1/(potOdds+1)`。风格调整：conservative 阈值 +0.02，aggressive −0.02（作用于 winRateDiff）。

- [ ] **Step 1: 追加失败测试**

```cpp
static void testDecision() {
  auto r = evaluateDecision(0.55, 100, 25, 75, "standard");
  CHECK(std::abs(r.potOdds - 0.25) < 1e-9);            // 25/100
  CHECK(std::abs(r.requiredEquity - 1.0/5.0) < 1e-9);  // 1/(4+1)
  CHECK(std::abs(r.evCall - (0.55*100 - 0.45*25)) < 1e-9);
  CHECK(r.evRaise > 0);
  CHECK(r.adviceLevel == "raise" || r.adviceLevel == "call");
  // 高胜率 → 强烈加注（standard）
  auto strong = evaluateDecision(0.85, 100, 25, 75, "standard");
  CHECK(strong.adviceLevel == "raise");
  // 低胜率 → fold
  auto weak = evaluateDecision(0.10, 100, 25, 75, "standard");
  CHECK(weak.adviceLevel == "fold");
  // 风格差异：激进比保守更倾向加注（同一数值下 aggressive 的建议不会更保守）
  auto cons = evaluateDecision(0.48, 100, 40, 100, "conservative");
  auto aggr = evaluateDecision(0.48, 100, 40, 100, "aggressive");
  static const int rankOf[] = { /*fold=0 neutral=1 call=2 raise=3*/ };
  auto lvl = [](const DecisionResult& d){ return d.adviceLevel=="raise"?3 : d.adviceLevel=="call"?2 : d.adviceLevel=="neutral"?1 : 0; };
  CHECK(lvl(aggr) >= lvl(cons));
}
```

- [ ] **Step 2: 跑测试确认失败**（编译失败：evaluateDecision 未定义）

- [ ] **Step 3: 实现**（equity_v2.h 追加结构体与函数声明；equity_v2.cpp 追加实现）

```cpp
DecisionResult evaluateDecision(double winRate, double pot, double call,
                                double raise, const std::string& adviceStyle) {
    DecisionResult r;
    r.potOdds = call <= 0 ? 0 : pot / call;
    r.requiredEquity = 1.0 / (r.potOdds + 1.0);
    r.evCall = winRate * pot - (1.0 - winRate) * call;
    // 加注EV：50%跟注 / 30%弃牌 / 20%再加注弃权（设计§5.7已知局限，如实建模）
    double foldEV = 0.3 * pot;
    double callEV = 0.5 * (winRate * (pot + raise + call) - (1.0 - winRate) * raise);
    r.evRaise = foldEV + callEV;

    double diff = winRate - r.requiredEquity;
    double bias = adviceStyle == "conservative" ? 0.02 : adviceStyle == "aggressive" ? -0.02 : 0.0;
    diff += bias;

    if (r.evRaise > r.evCall && r.evRaise > r.evCall * 1.3 && diff > 0.10) {
        r.advice = diff > 0.15 ? "强烈加注" : "加注"; r.adviceLevel = "raise";
    } else if (diff > 0.10) { r.advice = "强烈跟注"; r.adviceLevel = "call"; }
    else if (diff > 0.02)  { r.advice = "略微跟注"; r.adviceLevel = "call"; }
    else if (diff < -0.10) { r.advice = "强烈弃牌"; r.adviceLevel = "fold"; }
    else if (diff < -0.02) { r.advice = "略微弃牌"; r.adviceLevel = "fold"; }
    else { r.advice = "决策中性"; r.adviceLevel = "neutral"; }
    return r;
}
```
bindings.cpp 追加：
```cpp
  value_object<DecisionResult>("DecisionResult")
    .field("evCall", &DecisionResult::evCall)
    .field("evRaise", &DecisionResult::evRaise)
    .field("potOdds", &DecisionResult::potOdds)
    .field("requiredEquity", &DecisionResult::requiredEquity)
    .field("advice", &DecisionResult::advice)
    .field("adviceLevel", &DecisionResult::adviceLevel);
  function("evaluateDecision", &evaluateDecision);
```

- [ ] **Step 4: 跑测试确认通过** → `npm run test:engine` Expected: `ALL PASS`
- [ ] **Step 5: loader 容错**（`pokerCore.js` 追加错误页语义）

```js
export async function getCore() {
  if (!corePromise) {
    corePromise = import('./poker_core.js')
      .then(m => m.default.createPokerCore())
      .catch(err => { corePromise = null; throw err; });
  }
  return corePromise;
}
```
（main.js 接线在 Task 18；此处仅保证加载失败可重试。）

- [ ] **Step 6: Commit**

```bash
git add texas-web && git commit -m "feat(engine): style-aware evaluateDecision + wasm loader retry"
```
更新 CLAUDE.md 并提交。

---

# 阶段B：策略层（JS 纯函数，Vitest）

### Task 8: rankTable.js — 起手牌169类百分位（引擎生成静态表）

**Files:**
- Create: `texas-web/tests/generate-rank-table.mjs`, `texas-web/src/strategy/rankTable.js`, `texas-web/src/strategy/rankTable.test.js`

**Interfaces:**
- Produces:
```js
export const RANK_ORDER;               // string[169]，强→弱（引擎vs随机手胜率排序）
export function percentile(handClass); // 1..169
export function topClasses(widthPct);  // 按组合数累计达到 widthPct% 的前N个类
```

- [ ] **Step 1: 写生成脚本** `tests/generate-rank-table.mjs`（用已构建的 WASM 跑，**生成后提交静态 JSON**）

```js
// 用法：node tests/generate-rank-table.mjs（需先 npm run build:wasm 的 node 版，或用 test:engine 产物）
// 输出 src/strategy/rank-order.json：按胜率降序的169个类名
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
const ranks = 'AKQJT98765432'.split('');
const classes = [];
for (let hi = 0; hi < 13; hi++) for (let lo = hi; lo < 13; lo++) {
  classes.push(hi === lo ? ranks[hi] + ranks[lo] : ranks[hi] + ranks[lo] + 's');
  if (hi !== lo) classes.push(ranks[lo] + ranks[hi] + 'o'); // offsuit
}
// 代表组合：同花/异花各取一个具体两门
const suits = 'shdcs h d c'.replace(/ /g, ''); // 'shdc'
function sampleCards(cls) {
  const r1 = ranks.indexOf(cls[0]), r2 = ranks.indexOf(cls[1]);
  const rs = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
  const card = (r, s) => rs[r] + 'shdc'[s];
  if (cls.length === 2) return [card(r1, 0), card(r1, 1)];
  if (cls[2] === 's') return [card(r1, 0), card(r2, 0)];
  return [card(r1, 0), card(r2, 1)];
}
const mod = await import('../src/wasm/poker_core.js');
const core = await mod.default.createPokerCore();
const uniform = Array.from({length: 169}, () => 100);
const rows = [];
for (const cls of classes) {
  const hand = sampleCards(cls);
  const r = core.calculateEquityV2(hand, [], [uniform], 3000);
  rows.push({ cls, eq: r.winRate + r.tieRate * 0.5 });
}
rows.sort((a, b) => b.eq - a.eq);
mkdirSync(new URL('../src/strategy/', import.meta.url), { recursive: true });
writeFileSync(new URL('../src/strategy/rank-order.json', import.meta.url),
  JSON.stringify({ generatedAt: '2026-09-20', source: 'engine vs uniform 3000 sims', order: rows.map(r => r.cls) }, null, 1));
console.log('wrote rank-order.json,', rows.length, 'classes');
```

- [ ] **Step 2: 生成并检查**

Run: `node tests/generate-rank-table.mjs`
Expected: `wrote rank-order.json, 169 classes`；`rank-order.json` 的 order 前12个应包含 AA,KK,QQ,JJ,TT,AKs,AQs,AJs,KQs,99,ATs,AKo 的集合（人工目检）。

- [ ] **Step 3: 写失败测试** `src/strategy/rankTable.test.js`

```js
import { describe, it, expect } from 'vitest';
import { RANK_ORDER, percentile, topClasses } from './rankTable.js';
describe('rankTable', () => {
  it('169个类不重不漏', () => {
    expect(RANK_ORDER.length).toBe(169);
    expect(new Set(RANK_ORDER).size).toBe(169);
    expect(RANK_ORDER[0]).toBe('AA');
    expect(RANK_ORDER.at(-1)).toBe('72o');
  });
  it('百分位查询', () => {
    expect(percentile('AA')).toBe(1);
    expect(percentile('72o')).toBe(169);
  });
  it('topClasses 按组合数截取', () => {
    expect(topClasses(10).length).toBeGreaterThan(10);
    const combos = c => c.endsWith('s') ? 4 : c.endsWith('o') ? 12 : 6;
    let acc = 0;
    for (const c of topClasses(10)) acc += combos(c);
    expect(acc).toBeGreaterThanOrEqual(132.6);
    // 紧邻下一类不应仍在截取内（宽度不显著超出）
    expect(acc).toBeLessThan(132.6 * 1.5);
  });
});
```

- [ ] **Step 4: 实现** `src/strategy/rankTable.js`

```js
import data from './rank-order.json';
export const RANK_ORDER = data.order;
const pos = new Map(RANK_ORDER.map((c, i) => [c, i + 1]));
export function percentile(handClass) { return pos.get(handClass) ?? 169; }
const combos = c => c.endsWith('s') ? 4 : c.endsWith('o') ? 12 : 6;
export function topClasses(widthPct) {
  const target = 1326 * widthPct / 100;
  const out = []; let acc = 0;
  for (const c of RANK_ORDER) {
    if (acc >= target) break;
    out.push(c); acc += combos(c);
  }
  return out;
}
```

- [ ] **Step 5: 跑测试** → `npm run test` Expected: 全绿（含 rankTable 用例）
- [ ] **Step 6: Commit**

```bash
git add texas-web && git commit -m "feat(strategy): engine-generated 169-class rank table"
```
更新 CLAUDE.md 并提交。

---

### Task 9: charts.js — 13张常规表 + 3档Nash + 查询API

**Files:**
- Create: `texas-web/src/strategy/charts.js`, `texas-web/src/strategy/charts.test.js`

**Interfaces:**
- Consumes: 全局约定2（网格编码）
- Produces:
```js
export function handClassFor(cards);        // ["As","Ks"]→"AKs"；["As","Kd"]→"AKo"；["Ad","Ac"]→"AA"
export function gridCell(grid, handClass);  // → 'R'|'r'|'C'|'c'|'F'
export function isShort(effectiveStackBB);  // ≤15 短码
export function nashBand(effectiveStackBB); // '≤7'|'8-10'|'11-15'|null
export function getPreflopChart({position, raiserPosition, role, effectiveStackBB});
// role: 'open'|'defend'；返回 {kind:'open'|'defend'|'nash-push'|'nash-call', title, note, grid}
export const CHART_POSITION;                // 别名映射 {'UTG1':'UTG','MP1':'MP','LJ':'MP','HJ':'MP',...}
```

- [ ] **Step 1: 写失败测试**

```js
import { describe, it, expect } from 'vitest';
import { handClassFor, gridCell, isShort, nashBand, getPreflopChart } from './charts.js';
describe('charts', () => {
  it('handClassFor 三类映射', () => {
    expect(handClassFor(['As','Ks'])).toBe('AKs');
    expect(handClassFor(['As','Kd'])).toBe('AKo');
    expect(handClassFor(['Ad','Ac'])).toBe('AA');
    expect(handClassFor(['2c','3d'])).toBe('32o');   // 高牌在前
  });
  it('关键格抽查（公开共识）', () => {
    const open = getPreflopChart({position:'BTN', role:'open', effectiveStackBB:100});
    expect(gridCell(open.grid, 'AA')).toBe('R');
    expect(gridCell(open.grid, '72o')).toBe('F');
    const utg = getPreflopChart({position:'UTG', role:'open', effectiveStackBB:100});
    expect(gridCell(utg.grid, '72o')).toBe('F');
    expect(gridCell(utg.grid, 'AA')).toBe('R');
    // BTN 开牌显著宽于 UTG：数 R 格
    const rCount = g => g.join('').split('').filter(c => c === 'R').length;
    expect(rCount(open.grid)).toBeGreaterThan(rCount(utg.grid));
    const bb = getPreflopChart({position:'BB', raiserPosition:'UTG', role:'defend', effectiveStackBB:100});
    expect(gridCell(bb.grid, 'AA')).toBe('R');       // AA 面对 UTG 开牌 = 3bet
  });
  it('短码分档', () => {
    expect(isShort(100)).toBe(false);
    expect(isShort(12)).toBe(true);
    expect(nashBand(6)).toBe('≤7');
    expect(nashBand(9)).toBe('8-10');
    expect(nashBand(14)).toBe('11-15');
    expect(nashBand(20)).toBe(null);
  });
  it('Nash 表', () => {
    const push = getPreflopChart({position:'BTN', role:'open', effectiveStackBB:6});
    expect(push.kind).toBe('nash-push');
    expect(gridCell(push.grid, 'AA')).toBe('R');
    const call = getPreflopChart({position:'BB', raiserPosition:'BTN', role:'defend', effectiveStackBB:6});
    expect(call.kind).toBe('nash-call');
  });
  it('防守表选择', () => {
    expect(getPreflopChart({position:'BB', raiserPosition:'BTN', role:'defend', effectiveStackBB:100}).title).toContain('BB');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**（charts.js 不存在）

- [ ] **Step 3: 实现 charts.js（数据 + API 一次到位）**

```js
// GTO/Nash 图表：公开求解器共识的简化范围，手工整理（学习用途，设计§5.3）
// 网格：13串×13字符；行=高牌(A..2)，列=低牌；上三角同花/下三角异花/对角对子
// R=加注(推) r=混合偏加注 C=跟注 c=混合偏跟注 F=弃牌
const RANKS = 'AKQJT98765432';

export function handClassFor(cards) {
  const order = c => RANKS.indexOf(c[0]);
  const [a, b] = [...cards].sort((x, y) => order(x) - order(y));
  const hi = a[0], lo = b[0];
  if (hi === lo) return hi + lo;
  return a[1] === b[1] ? hi + lo + 's' : lo + hi + 'o';
}

export function gridCell(grid, handClass) {
  const row = RANKS.indexOf(handClass[0]);
  const col = RANKS.indexOf(handClass[1]);
  return grid[row][col];
}

const C = (i, j) => RANKS[i] === RANKS[j] ? RANKS[i] + RANKS[i] : (j > i ? RANKS[i] + RANKS[j] + 's' : RANKS[j] + RANKS[i] + 'o');
// 便捷：由 (row,col) 求类名（渲染热力图用）

const OPEN = {
  UTG: [
    'RRRRRFFFFrrrF', 'RRRRrFFFFFFFF', 'RrRRrFFFFFFFF', 'rFFRRrFFFFFFF',
    'FFFFRRrFFFFFF', 'FFFFFRrFFFFFF', 'FFFFFFFrFFFFF', 'FFFFFFFRrFFFF',
    'FFFFFFFFrrFFF', 'FFFFFFFFFrrFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF'],
  MP: [
    'RRRRRrFFFrrrF', 'RRRRrrFFFFFFF', 'crRCcCFFFFFFF'.replace('c','R'), // 修正见下：MP的Q行=RrRRrF...
    'rrrRRrFFFFFFF', 'rFFFRRrFFFFFF', 'FFFFFRrFFFFFF', 'FFFFFFFRrFFFF',
    'FFFFFFFFRrFFF', 'FFFFFFFFFrrFF', 'FFFFFFFFFFrFF', 'FFFFFFFFFFFrF', 'FFFFFFFFFFFFF'],
  CO: [
    'RRRRRrrrrRrrr', 'RRRRRrFFFFFFF', 'RRRRRRrFFFFFF', 'RrrRRRrFFFFFF',
    'rrrrRRRrFFFFF', 'rrFFFRrFFFFFF', 'FFFFFFRRrFFFF', 'FFFFFFFRRrFFF',
    'FFFFFFFFRRrFF', 'FFFFFFFFFrRrF', 'FFFFFFFFFFrrF', 'FFFFFFFFFFFrr', 'FFFFFFFFFFFFr'],
  BTN: [
    'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'rRrRRRRRRRRRR',
    'rrrrRRRRRRRRR', 'rrrrrRRRRRRRR', 'rFFFrrRRRRRRR', 'rFFFFFrRRRRRR',
    'rFFFFFrrRRRRR', 'rFFFFFFFrRRRR', 'rFFFFFFFFRRRR', 'rFFFFFFFFFFRR', 'rFFFFFFFFFFFR'],
  SB: [
    'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'rrrRRRRRRRRRR',
    'rrrFRRRRRRRRR', 'rFFFrRRRRRRRR', 'rFFFFFrRRRRRR', 'rFFFFFrRRRRRR',
    'rFFFFFFrRRRRR', 'rFFFFFFFrRRRR', 'rFFFFFFFFFRRR', 'rFFFFFFFFFFRR', 'rFFFFFFFFFFFR'],
};
// MP Q行修正（AQo R, KQo r, QQ R, QJs R, QTs r, Q9s r）：
OPEN.MP[2] = 'RrRRrrFFFFFFF';

const DEFEND = {
  'BB:UTG': [
    'RrCCCFFccrrcc', 'RrCCccFFFFFFF', 'ccRCccFFFFFFF', 'cccRCcFFFFFFF',
    'ccccCCcFFFFFF', 'FFFFcCCcFFFFF', 'FFFFFFCCcFFFF', 'FFFFFFFCCcFFF',
    'FFFFFFFFCCcFF', 'FFFFFFFFFCCcF', 'FFFFFFFFFFCcF', 'FFFFFFFFFFFCc', 'FFFFFFFFFFFFC'],
  'BB:MP': [
    'RrCCCcFccrrcc', 'RrCcccFFFFFFF', 'crRCcCFFFFFFF', 'cccRCCFFFFFFF',
    'ccccCCcFFFFFF', 'FFFFcCCcFFFFF', 'FFFFFFCCcFFFF', 'FFFFFFFCCcFFF',
    'FFFFFFFFCCcFF', 'FFFFFFFFFCCcF', 'FFFFFFFFFFCcF', 'FFFFFFFFFFFCc', 'FFFFFFFFFFFFC'],
  'BB:CO': [
    'RRCCCCcccRRRR', 'RRRCCCccFFFFF', 'rrRRCCccFFFFF', 'CccRRCCcFFFFF',
    'CcccRRCccFFFF', 'ccccCRRCcFFFF', 'cFFFFccRRCcFF', 'cFFFFFcRRCcFF',
    'cFFFFFFcRRCcF', 'cFFFFFFFcCCcF', 'cFFFFFFFFcCcF', 'cFFFFFFFFFFCc', 'cFFFFFFFFFFFC'],
  'BB:BTN': [
    'RRRCCCcccRRRR', 'RRRCCCccFFFFF', 'RrRRCCccFFFFF', 'RrcRRCccFFFFF',
    'RcccRRCccFFFF', 'CCccCRRCcFFFF', 'cFFFFccRRCcFF', 'cFFFFFcRRCcFF',
    'cFFFFFFcRRCcF', 'cFFFFFFFcCCcF', 'cFFFFFFFFcRcF', 'cFFFFFFFFFFRc', 'cFFFFFFFFFFFR'],
  'BB:SB': [
    'RRRRCCCccRRRR', 'RRRRCCccFFFFF', 'RRRRCCccFFFFF', 'RRcRRCcCFFFFF',
    'CCccRRCcCFFFF', 'CcccCRRCCcFFF', 'cFFFFcRRCCcFF', 'cFFFFFcRRCCcF',
    'cFFFFFFcRRCCc', 'cFFFFFFFcRCCc', 'cFFFFFFFFcRCc', 'cFFFFFFFFFFRC', 'cFFFFFFFFFFFR'],
  'SB:MP': [
    'RRRRrFFFFrRRR', 'RRRRFFFFFFFFF', 'RRRRFFFFFFFFF', 'RrFRFFFFFFFFF',
    'rFFFRFFFFFFFF', 'FFFFFRrFFFFFF', 'FFFFFFRrFFFFF', 'FFFFFFFRrFFFF',
    'FFFFFFFFrrFFF', 'FFFFFFFFFrFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF'],
  'SB:CO': [
    'RRRRrFFFFRRRR', 'RRRRrFFFFFFFF', 'RRRRrFFFFFFFF', 'RrFRrFFFFFFFF',
    'rFFFRrFFFFFFF', 'FFFFFRrFFFFFF', 'FFFFFFRrFFFFF', 'FFFFFFFRrFFFF',
    'FFFFFFFFrrFFF', 'FFFFFFFFFrrFF', 'FFFFFFFFFFrFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF'],
  'SB:BTN': [
    'RRRRrFFFFRRRR', 'RRRRrFFFFFFFF', 'RRRRrFFFFFFFF', 'RrrRrFFFFFFFF',
    'rFFFRrFFFFFFF', 'FFFFFRRrFFFFF'.replace('r','R'), // T9s R
    'FFFFFFRRrFFFF', 'FFFFFFFRRrFFF', 'FFFFFFFFRRFFF', 'FFFFFFFFFrrFF',
    'FFFFFFFFFFrFF', 'FFFFFFFFFFFrF', 'FFFFFFFFFFFFr'],
};
DEFEND['SB:BTN'][4] = 'rFFFRrFFFFFFF';
DEFEND['SB:BTN'][5] = 'FFFFFRRFFFFFFF';

const NASH = {
  '≤7': {
    push: [
      'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR',
      'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR',
      'RRRRRFRRRRRRR', 'RRFFFFFFRRRRR', 'RFFFFFFFFRRRR', 'RFFFFFFFFFFRR', 'RFFFFFFFFFFFR'],
    call: [
      'CCCCCCCCCCCCC', 'CCCCCCccFFFFF', 'CCCCCCccFFFFF', 'CCCCCCccFFFFF',
      'CCCCCCcFFFFFF', 'CccccCCFFFFFF', 'CFFFFFCcFFFFF', 'cFFFFFFCcFFFF',
      'cFFFFFFFCcFFF', 'cFFFFFFFFCFFF', 'cFFFFFFFFFCFF', 'cFFFFFFFFFFCF', 'cFFFFFFFFFFFC'],
  },
  '8-10': {
    push: [
      'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR',
      'RRRRRRRRRRRRR', 'RRRRRRRRFFFFF', 'RRRRRRRRrFFFF', 'RRRFFFRRRrFFF',
      'RFFFFFrrRRrFF', 'RFFFFFFFrRRrF', 'RFFFFFFFFrRrF', 'RFFFFFFFFFFRr', 'RFFFFFFFFFFFR'],
    call: [
      'CCCCCcFFFFFFF', 'CCCCcFFFFFFFF', 'CcCCcFFFFFFFF', 'CFFCCcFFFFFFF',
      'FFFFCCcFFFFFF', 'FFFFFCcFFFFFF', 'FFFFFFCFFFFFF', 'FFFFFFFCFFFFF',
      'FFFFFFFFcFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF'],
  },
  '11-15': {
    push: [
      'RRRRRrFFFFFFF', 'RRRRrFFFFFFFF', 'RrRRFFFFFFFFF', 'RFFRRrFFFFFFF',
      'FFFFRrFFFFFFF', 'FFFFFRFFFFFFF', 'FFFFFFRFFFFFF', 'FFFFFFFrFFFFF',
      'FFFFFFFFrFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF'],
    call: [
      'CCCFFFFFFFFFF', 'CCFFFFFFFFFFF', 'cCFFFFFFFFFFF', 'FFFCFFFFFFFFF',
      'FFFFCFFFFFFFF', 'FFFFFcFFFFFFF', 'FFFFFFCFFFFFF', 'FFFFFFFFFFFFF',
      'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF'],
  },
};

const OPEN_TITLES = { UTG:'枪口位(UTG)开牌', MP:'中位(MP)开牌', CO:'关煞位(CO)开牌', BTN:'按钮位(BTN)开牌', SB:'小盲位(SB)开牌' };
const DEF_TITLES = { BB:'大盲位(BB)防守', SB:'小盲位(SB)防守' };

export const CHART_POSITION = { UTG1:'UTG', UTG2:'UTG', MP1:'MP', LJ:'MP', HJ:'MP' };
export function isShort(effBB) { return effBB > 0 && effBB <= 15; }
export function nashBand(effBB) {
  if (effBB <= 7) return '≤7';
  if (effBB <= 10) return '8-10';
  if (effBB <= 15) return '11-15';
  return null;
}

export function getPreflopChart({ position, raiserPosition = '', role = 'open', effectiveStackBB = 100 }) {
  const band = nashBand(effectiveStackBB);
  if (band) {
    if (role === 'open' && ['CO','BTN','SB'].includes(position)) {
      return { kind:'nash-push', title:`Nash推弃 · ${band}BB · ${position}推注`,
        note:'短码简化版：以BTN/SB为基准，CO应略收紧。仅含推/弃两个动作。', grid: NASH[band].push };
    }
    if (role === 'defend' && position === 'BB') {
      return { kind:'nash-call', title:`Nash推弃 · ${band}BB · BB跟注`,
        note:'以BTN推注为基准的保守跟注范围。', grid: NASH[band].call };
    }
    // 短码但场景不在推/弃模式：继续用常规表
  }
  if (role === 'open') {
    const p = CHART_POSITION[position] ?? position;
    return { kind:'open', title: OPEN_TITLES[p] ?? `${position}开牌`, note:'100BB 单次加注场景（简化共识）', grid: OPEN[p] ?? OPEN.MP };
  }
  // defend
  const p = CHART_POSITION[position] ?? position;
  const r = CHART_POSITION[raiserPosition] ?? raiserPosition;
  if (p === 'BB') {
    const key = `BB:${['UTG','MP','CO','BTN','SB'].includes(r) ? r : 'CO'}`;
    return { kind:'defend', title:`大盲位(BB)防守 vs ${r}开牌`, note:'R=3bet C=跟注 F=弃牌（简化共识）', grid: DEFEND[key] };
  }
  if (p === 'SB') {
    const key = `SB:${['MP','CO','BTN'].includes(r) ? r : 'CO'}`;
    return { kind:'defend', title:`小盲位(SB)防守 vs ${r}开牌`, note:'3bet或弃牌策略为主（简化共识）', grid: DEFEND[key] };
  }
  // 其他位置防守：以BB表为参考
  const key = `BB:${['UTG','MP','CO','BTN','SB'].includes(r) ? r : 'CO'}`;
  return { kind:'defend', title:`${position}防守 vs ${r}开牌（以BB表为参考）`, note:'非盲注位防守简化处理', grid: DEFEND[key] };
}
```
实现时**删除两处 `.replace` 补丁的写法，直接写最终字符串**（上面仅为生成过程标记）：`OPEN.MP[2]='RrRRrrFFFFFFF'`；`DEFEND['SB:BTN'][5]='FFFFFRRFFFFFFF'` 保留为数组内字面量。

- [ ] **Step 4: 跑测试** → `npm run test` Expected: charts 用例全绿（宽度和关键格）。若有格错位，优先核对全局约定2。
- [ ] **Step 5: Commit**

```bash
git add texas-web && git commit -m "feat(strategy): 13 preflop charts + 3-band Nash push/fold data"
```
更新 CLAUDE.md 并提交。

---

### Task 10: ranges.js — 对手类型/滑条/观察值 → 169格掩码

**Files:**
- Create: `texas-web/src/strategy/ranges.js`, `texas-web/src/strategy/ranges.test.js`

**Interfaces:**
- Consumes: charts.js `getPreflopChart`/`gridCell`；rankTable.js `topClasses`
- Produces:
```js
export const TYPE_DEFAULTS = {
  'TAG':            { looseness: 35, aggression: 60, vpip: 22, factor: 0.8 },
  'LAG':            { looseness: 62, aggression: 75, vpip: 38, factor: 1.3 },
  'tight-passive':  { looseness: 25, aggression: 20, vpip: 15, factor: 0.6 },
  'loose-passive':  { looseness: 72, aggression: 25, vpip: 42, factor: 1.5 },
};
export function loosenessToVpip(looseness);       // 0-100 → 10-60
export function maskForOpponent(opp, ctx);
// opp: {type, looseness, handsSeen?, vpipObs?}
// ctx: {position:'BB', role:'open'|'defend', raiserPosition?, effectiveStackBB}
// 返回 {mask: Uint8Array(169), widthPct}
// 规则（设计§5.2）：观察VPIP(≥20手)优先 > 滑条目标 > 类型默认VPIP；
//   open 场景按位置开牌表宽度缩放；defend 场景用对应防守表；目标宽度=VPIP%，按rank序截取
```

- [ ] **Step 1: 失败测试**

```js
import { describe, it, expect } from 'vitest';
import { maskForOpponent, loosenessToVpip, TYPE_DEFAULTS } from './ranges.js';
const combos = c => c.endsWith('s') ? 4 : c.endsWith('o') ? 12 : 6;
const widthOf = mask => mask.reduce((a, w, i) => a + w, 0) / 100;
describe('ranges', () => {
  it('loosenessToVpip', () => {
    expect(loosenessToVpip(0)).toBe(10);
    expect(loosenessToVpip(100)).toBe(60);
    expect(loosenessToVpip(50)).toBe(35);
  });
  it('紧弱对手范围显著窄于松弱', () => {
    const tp = maskForOpponent({type:'tight-passive', looseness:25}, {position:'MP', role:'open'});
    const lp = maskForOpponent({type:'loose-passive', looseness:72}, {position:'MP', role:'open'});
    expect(widthOf(tp.mask)).toBeLessThan(20);
    expect(widthOf(lp.mask)).toBeGreaterThan(38);
    expect(tp.mask).toBeInstanceOf(Uint8Array);
    expect(tp.mask.length).toBe(169);
  });
  it('观察值优先（≥20手）', () => {
    const m = maskForOpponent({type:'LAG', looseness:62, handsSeen:30, vpipObs:20}, {position:'MP', role:'open'});
    expect(widthOf(m.mask)).toBeLessThan(25);   // 观察VPIP 20 覆盖类型默认38
  });
  it('观察不足20手用滑条/类型默认', () => {
    const m = maskForOpponent({type:'LAG', looseness:62, handsSeen:5, vpipObs:20}, {position:'MP', role:'open'});
    expect(widthOf(m.mask)).toBeGreaterThan(30);
  });
  it('防守场景比开牌窄', () => {
    const open = maskForOpponent({type:'TAG', looseness:35}, {position:'BB', role:'open'});
    const def  = maskForOpponent({type:'TAG', looseness:35}, {position:'BB', role:'defend', raiserPosition:'BTN'});
    expect(widthOf(def.mask)).toBeLessThan(widthOf(open.mask));
  });
});
```

- [ ] **Step 2: 跑失败 → Step 3: 实现**

```js
import { getPreflopChart, gridCell, CHART_POSITION } from './charts.js';
import { topClasses } from './rankTable.js';

export const TYPE_DEFAULTS = {
  'TAG':           { looseness: 35, aggression: 60, vpip: 22, factor: 0.8 },
  'LAG':           { looseness: 62, aggression: 75, vpip: 38, factor: 1.3 },
  'tight-passive': { looseness: 25, aggression: 20, vpip: 15, factor: 0.6 },
  'loose-passive': { looseness: 72, aggression: 25, vpip: 42, factor: 1.5 },
};

const combos = c => c.endsWith('s') ? 4 : c.endsWith('o') ? 12 : 6;

export function loosenessToVpip(looseness) { return Math.round(10 + looseness * 0.5); }

function maskFromClasses(classes) {
  const mask = new Uint8Array(169);
  // 由类名回填：把 rank-order 中这些类的格子置100
  for (const cls of classes) {
    const i = RANK_INDEX.get(cls);
    if (i !== undefined) mask[i] = 100;
  }
  return mask;
}
import { RANK_ORDER } from './rankTable.js';
const RANK_INDEX = new Map(RANK_ORDER.map((c, i) => [c, i]));

function widthOfMask(mask) {
  let w = 0;
  for (let i = 0; i < 169; i++) if (mask[i]) w += (mask[i] / 100) * combos(RANK_ORDER ? classOf(i) : '');
  return w;
}
// classOf(i)：与 charts.js 同约定
const RANKS = 'AKQJT98765432';
function classOf(i) {
  const r = Math.floor(i / 13), c = i % 13;
  if (r === c) return RANKS[r] + RANKS[r];
  return c > r ? RANKS[r] + RANKS[c] + 's' : RANKS[c] + RANKS[r] + 'o';
}
function widthPctOfMask(mask) {
  let combosLive = 0;
  for (let i = 0; i < 169; i++) if (mask[i] === 100) combosLive += combos(classOf(i));
  return (combosLive / 1326) * 100;
}

export function maskForOpponent(opp, ctx) {
  const def = TYPE_DEFAULTS[opp.type] ?? TYPE_DEFAULTS['TAG'];
  // 目标VPIP：观察值(≥20手) > 滑条 > 类型默认
  const vpip = (opp.handsSeen >= 20 && opp.vpipObs > 0) ? opp.vpipObs
             : (opp.looseness != null && opp.looseness !== def.looseness) ? loosenessToVpip(opp.looseness)
             : def.vpip;
  const targetWidth = Math.min(60, Math.max(10, vpip));

  // 基础表：defend 用防守表；open 用对手位置开牌表
  const chart = ctx.role === 'defend'
    ? getPreflopChart({ position: ctx.position, raiserPosition: ctx.raiserPosition, role: 'defend', effectiveStackBB: ctx.effectiveStackBB ?? 100 })
    : getPreflopChart({ position: ctx.position, role: 'open', effectiveStackBB: ctx.effectiveStackBB ?? 100 });

  // 起点掩码：图表中 R/r（open）或 R/r/C/c（defend）视为"在范围内"
  const base = new Uint8Array(169);
  for (let i = 0; i < 169; i++) {
    const a = gridCell(chart.grid, classOf(i));
    if (chart.kind.startsWith('nash') ? a === 'R' : (a === 'R' || a === 'r' || (ctx.role === 'defend' && (a === 'C' || a === 'c')))) base[i] = 100;
  }

  // 以 rank 序截取到目标宽度（观察/滑条驱动）
  const mask = new Uint8Array(169);
  let acc = 0; const target = 1326 * targetWidth / 100;
  for (const cls of RANK_ORDER) {
    if (acc >= target) break;
    const i = RANK_INDEX.get(cls);
    if (base[i]) { mask[i] = 100; acc += combos(cls); }
  }
  return { mask, widthPct: +widthPctOfMask(mask).toFixed(1) };
}
```
（实现时整理 import 到文件顶部；`widthOfMask` 冗余函数删除。）

- [ ] **Step 4: 跑测试** → `npm run test` Expected: 全绿
- [ ] **Step 5: Commit**

```bash
git add texas-web && git commit -m "feat(strategy): opponent type/slider/observed VPIP to 169-cell range mask"
```
更新 CLAUDE.md 并提交。

---

### Task 11: texture.js — 牌面纹理分析

**Files:**
- Create: `texas-web/src/strategy/texture.js`, `texas-web/src/strategy/texture.test.js`

**Interfaces:**
- Produces:
```js
export function analyzeTexture(board);  // board: string[]（3-5张）
// → { label:'干燥'|'中性'|'湿润', features:string[], suitCount:number, isPaired:boolean, highCardRank:number, hasStraightDraw:boolean }
```
规则（设计§5.4A）：同花性（彩虹0/两同花2/单调≥3）+ 连线性（连子≥2组/半连子/干燥）+ 结构（对子/高牌面）→ 综合评级。

- [ ] **Step 1: 失败测试**

```js
import { describe, it, expect } from 'vitest';
import { analyzeTexture } from './texture.js';
describe('texture', () => {
  it('彩虹高牌面 = 干燥', () => {
    const t = analyzeTexture(['As','Kd','7h']);
    expect(t.label).toBe('干燥');
    expect(t.suitCount).toBe(0);
  });
  it('单调连牌 = 湿润', () => {
    const t = analyzeTexture(['9h','8h','7h']);
    expect(t.label).toBe('湿润');
    expect(t.features.some(f => f.includes('同花'))).toBe(true);
    expect(t.features.some(f => f.includes('连'))).toBe(true);
  });
  it('对子面降湿', () => {
    const t = analyzeTexture(['8s','8d','2h']);
    expect(t.isPaired).toBe(true);
    expect(t.label).not.toBe('湿润');
  });
  it('5张河牌双同花', () => {
    const t = analyzeTexture(['As','Ks','7s','2d','9c']);
    expect(t.suitCount).toBe(3);
  });
});
```

- [ ] **Step 2: 跑失败 → Step 3: 实现**

```js
const RANKS = '23456789TJQKA';
const rankOf = c => RANKS.indexOf(c[0]);      // 0..12
export function analyzeTexture(board) {
  const features = [];
  const ranks = board.map(rankOf).sort((a, b) => b - a);
  const suits = board.map(c => c[1]);
  const suitCounts = {};
  for (const s of suits) suitCounts[s] = (suitCounts[s] || 0) + 1;
  const maxSuit = Math.max(0, ...Object.values(suitCounts));
  const suitCount = maxSuit >= 3 ? maxSuit : 0;      // 0=无同花可能, 2=双同花, ≥3=单调
  if (suitCount === 2) features.push('两同花');
  if (suitCount >= 3) features.push('单调' + maxSuit + '同花');

  const counts = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
  const isPaired = Object.values(counts).some(n => n >= 2);
  if (isPaired) features.push('对子面');

  // 连线性：窗口5内不同rank数 ≥4 即有顺子潜力
  const uniq = [...new Set(ranks)];
  let maxRun = 0;
  for (let start = 0; start < uniq.length; start++) {
    let run = 1;
    for (let i = start + 1; i < uniq.length; i++) {
      if (uniq[i - 1] - uniq[i] === 1) run++; else break;
    }
    maxRun = Math.max(maxRun, run);
  }
  // A可作低牌（5432A）
  if (uniq.includes(12) && uniq.slice(0, 3).join(',') === '3,2,1' && uniq.includes(0)) maxRun = Math.max(maxRun, 4);
  const hasStraightDraw = maxRun >= 3;
  if (maxRun >= 4) features.push('顺子面');
  else if (maxRun === 3) features.push('半连子');

  const highCardRank = ranks[0];                     // 12=A
  if (highCardRank >= 11) features.push('高牌面');

  let wet = 0;
  if (suitCount === 2) wet += 1;
  if (suitCount >= 3) wet += 2;
  if (maxRun >= 4) wet += 2; else if (maxRun === 3) wet += 1;
  if (isPaired) wet -= 1;
  const label = wet >= 3 ? '湿润' : wet >= 1 ? '中性' : '干燥';
  return { label, features, suitCount: suitCount === 2 ? 2 : suitCount >= 3 ? maxSuit : 0,
           isPaired, highCardRank, hasStraightDraw };
}
```

- [ ] **Step 4: 跑测试** → 全绿
- [ ] **Step 5: Commit** `git commit -m "feat(strategy): board texture analyzer"`，更新 CLAUDE.md。

---

### Task 12: mdf.js — MDF/α + outs 检测 + 4-2法则

**Files:**
- Create: `texas-web/src/strategy/mdf.js`, `texas-web/src/strategy/mdf.test.js`

**Interfaces:**
- Produces:
```js
export function mdfAlpha(bet, pot);          // → {mdf:0-1, alpha:0-1}
export function detectOuts(hand, board);     // → {outs:number, draws:string[]}
export function outsToEquity(outs, streetsLeft); // streetsLeft: 1或2 → 概率0-1（4-2法则）
```

- [ ] **Step 1: 失败测试**

```js
import { describe, it, expect } from 'vitest';
import { mdfAlpha, detectOuts, outsToEquity } from './mdf.js';
describe('mdf', () => {
  it('标准表值（设计§5.4C）', () => {
    expect(mdfAlpha(33, 100).alpha).toBeCloseTo(33 / 133, 3);
    expect(mdfAlpha(33, 100).mdf).toBeCloseTo(1 - 33 / 133, 3);
    expect(mdfAlpha(75, 100).alpha).toBeCloseTo(0.4286, 3);
  });
  it('outs 检测', () => {
    expect(detectOuts(['Ah','2h'], ['4h','9s','Kd']).outs).toBe(9);   // 同花听
    expect(detectOuts(['9h','8s'], ['7d','6c','2h']).outs).toBe(8);   // 两头顺
    expect(detectOuts(['9h','8s'], ['7d','5c','2h']).outs).toBe(4);   // 卡顺
    const d = detectOuts(['Ah','Kh'], ['2h','9h','Kd']);
    expect(d.draws.some(x => x.includes('同花'))).toBe(true);
  });
  it('4-2法则', () => {
    expect(outsToEquity(9, 2)).toBeCloseTo(0.36, 2);
    expect(outsToEquity(9, 1)).toBeCloseTo(0.18, 2);
  });
});
```

- [ ] **Step 2: 跑失败 → Step 3: 实现**

```js
export function mdfAlpha(bet, pot) {
  const a = bet <= 0 ? 0 : bet / (pot + bet);
  return { mdf: 1 - a, alpha: a };
}

const RANKS = '23456789TJQKA';
const rankOf = c => RANKS.indexOf(c[0]);
const suitOf = c => c[1];

export function detectOuts(hand, board) {
  const all = [...hand, ...board];
  const draws = [];
  let outs = 0;
  // 同花听（恰4张同花色，含至少1张手牌）
  const bySuit = {};
  for (const c of all) (bySuit[suitOf(c)] ||= []).push(c);
  for (const [s, cs] of Object.entries(bySuit)) {
    if (cs.length === 4 && cs.some(c => hand.includes(c))) { outs += 9; draws.push('同花听(9 outs)'); }
  }
  // 顺子听：在13个rank轴上数连续窗口
  const rset = new Set(all.map(rankOf));
  const straightOuts = new Set();
  for (let hi = 4; hi <= 12; hi++) {           // 高牌从5(=idx4)到A(=idx12)
    const need = [];
    for (let r = hi - 4; r <= hi; r++) if (!rset.has(r)) need.push(r);
    if (need.length === 1) {                   // 两头顺或卡顺的补一张成顺
      for (let s = 0; s < 4; s++) straightOuts.add(need[0] * 4 + s);
    }
  }
  if (straightOuts.size >= 8) { outs += 8; draws.push('两头顺听(8 outs)'); }
  else if (straightOuts.size >= 4) { outs += 4; draws.push('卡顺听(4 outs)'); }
  // 口袋对追套装
  const [h1, h2] = hand;
  if (rankOf(h1) === rankOf(h2)) {
    const boardSame = board.filter(c => rankOf(c) === rankOf(h1)).length;
    if (boardSame === 0) { outs += 2; draws.push('套装听(2 outs)'); }
  }
  // 后门（仅翻牌3张时）
  if (board.length === 3) {
    if (Object.values(bySuit).some(cs => cs.length === 3 && cs.some(c => hand.includes(c)))) draws.push('后门同花(1-2 outs)');
    if (!straightOuts.size && rset.size >= 4) draws.push('后门顺(1-2 outs)');
  }
  return { outs, draws };
}

export function outsToEquity(outs, streetsLeft) {
  return Math.min(1, outs * (streetsLeft === 2 ? 4 : 2) / 100);
}
```

- [ ] **Step 4: 跑测试** → 全绿。**注**：两头顺测试用例 `['9h','8s'],['7d','6c','2h']` 需检测窗口 6-9 与 5-9；若实现只匹配1个缺口窗口会得4——测试期望8会失败，此时把"补一张成顺"逻辑核对为：窗口内**恰缺1张且该缺牌的4花色全为 outs**（两头顺=两个相邻窗口共享缺口之外还有第二个缺口）。实现修正：若存在**两个不同**的单缺窗口且各自补牌集不相交部分 ≥8 → 8 outs。以测试为准调整。
- [ ] **Step 5: Commit** `git commit -m "feat(strategy): MDF/alpha, outs detection, 4-2 rule"`，更新 CLAUDE.md。

---

### Task 13: sizing.js — 下注尺寸/SPR/价值诈唬平衡

**Files:**
- Create: `texas-web/src/strategy/sizing.js`, `texas-web/src/strategy/sizing.test.js`

**Interfaces:**
- Consumes: texture.js `analyzeTexture`
- Produces:
```js
export function cBetSuggestion(textureLabel, adviceStyle);  // → {pct:0.33|0.66|0.75, freq:'高'|'低', reason:string}
export function sprInfo(effectiveStack, pot);               // → {spr:number, category:'≤4'|'5-8'|'>8', note:string}
export function riverValueBluffRatio(betPct);               // 1/3池→3:1, 2/3→2:1, 超池→1:1
export function defendAdvice(faceBetPct, winRate);          // → {action:string, reason:string}
```

- [ ] **Step 1: 失败测试**

```js
import { describe, it, expect } from 'vitest';
import { cBetSuggestion, sprInfo, riverValueBluffRatio, defendAdvice } from './sizing.js';
describe('sizing', () => {
  it('干燥面小注高频率，湿面大注低频率（§5.4B）', () => {
    expect(cBetSuggestion('干燥', 'standard').pct).toBeCloseTo(0.33);
    const wet = cBetSuggestion('湿润', 'standard');
    expect(wet.pct).toBeGreaterThanOrEqual(0.66);
    expect(cBetSuggestion('中性', 'standard').pct).toBeCloseTo(0.5);
  });
  it('风格微调', () => {
    expect(cBetSuggestion('干燥', 'aggressive').pct).toBeGreaterThanOrEqual(cBetSuggestion('干燥', 'conservative').pct);
  });
  it('SPR 分档', () => {
    expect(sprInfo(40, 100).spr).toBe(0.4);
    expect(sprInfo(40, 100).category).toBe('≤4');
    expect(sprInfo(800, 100).category).toBe('>8');
  });
  it('河牌价值诈唬比', () => {
    expect(riverValueBluffRatio(1/3)).toBe('3:1');
    expect(riverValueBluffRatio(2/3)).toBe('2:1');
    expect(riverValueBluffRatio(1.2)).toBe('1:1');
  });
  it('防守建议', () => {
    expect(defendAdvice(0.33, 0.30).action).toContain('跟注');   // 小注宽防
    expect(defendAdvice(1.5, 0.25).action).toContain('弃');     // 超池仅强牌
  });
});
```

- [ ] **Step 2: 跑失败 → Step 3: 实现**

```js
export function cBetSuggestion(textureLabel, adviceStyle = 'standard') {
  const bias = adviceStyle === 'aggressive' ? 0.08 : adviceStyle === 'conservative' ? -0.08 : 0;
  if (textureLabel === '干燥') return { pct: 0.33 + bias, freq: '高', reason: '干燥面小注高频率：让空气牌便宜弃权、差牌付钱' };
  if (textureLabel === '湿润') return { pct: 0.66 + bias, freq: '低', reason: '湿润面大注低频率：价值+半诈唬，给听牌错误赔率' };
  return { pct: 0.5 + bias * 0.5, freq: '中', reason: '中性面中等尺寸均衡下注' };
}

export function sprInfo(effectiveStack, pot) {
  const spr = pot > 0 ? effectiveStack / pot : Infinity;
  const category = spr <= 4 ? '≤4' : spr <= 8 ? '5-8' : '>8';
  const note = spr <= 4 ? '低SPR：顶对以上可倾向打光' : spr > 8 ? '高SPR：弱顶对注意控池' : '中SPR：正常尺度决策';
  return { spr: +spr.toFixed(2), category, note };
}

export function riverValueBluffRatio(betPct) {
  if (betPct <= 0.4) return '3:1';
  if (betPct <= 0.8) return '2:1';
  return '1:1';
}

export function defendAdvice(faceBetPct, winRate) {
  if (faceBetPct <= 0.5) {
    return winRate >= 0.25 ? { action: '放宽跟注', reason: '面对小注，MDF要求防守大多数范围' }
                           : { action: '考虑弃牌', reason: '范围太弱，即使小注也难以继续' };
  }
  if (faceBetPct > 1.0) {
    return winRate >= 0.55 ? { action: '仅强牌继续', reason: '超池下注只跟强牌' }
                           : { action: '倾向弃牌', reason: '超池需极强范围才能防守' };
  }
  return winRate >= 0.35 ? { action: '标准防守', reason: '常规尺寸按底池赔率与MDF决策' }
                         : { action: '收紧跟注', reason: '胜率不足，选择性强防' };
}
```

- [ ] **Step 4: 跑测试** → 全绿
- [ ] **Step 5: Commit** `git commit -m "feat(strategy): bet sizing, SPR, value-bluff ratio, defend advice"`，更新 CLAUDE.md。

---

### Task 14: implied.js + tableDynamics.js — 隐含赔率与桌子动态适配器

**Files:**
- Create: `texas-web/src/strategy/implied.js`, `texas-web/src/strategy/tableDynamics.js` 及两个测试文件

**Interfaces:**
- Consumes: TYPE_DEFAULTS（ranges.js）
- Produces:
```js
// implied.js
export function impliedOdds(call, pot, opponentType);  // → {future, required}  需胜率=call/(pot+call+future)
// tableDynamics.js
export function tableProfile(opponents);   // → {label:'松弱桌'|'紧弱桌'|'紧凶桌'|'松凶桌'|'均衡', vpipAvg, aggrAvg, adjustments:string[]} | null(对手<2)
export function adjustAdvice(adviceLevel, isBluffish, profile, enabled);
// enabled=false 只算画像不修正；修正只作用于诈唬类建议频率倾向（§5.6）
```

- [ ] **Step 1: 失败测试**

```js
import { describe, it, expect } from 'vitest';
import { impliedOdds } from './implied.js';
import { tableProfile, adjustAdvice } from './tableDynamics.js';
describe('implied', () => {
  it('松弱跟注站隐含赔率高', () => {
    const lp = impliedOdds(50, 100, 'loose-passive');
    const tp = impliedOdds(50, 100, 'tight-passive');
    expect(lp.future).toBeGreaterThan(tp.future);
    expect(lp.required).toBeLessThan(tp.required);
  });
});
describe('tableDynamics', () => {
  it('松弱桌判定与修正', () => {
    const opps = [
      { type: 'loose-passive' }, { type: 'loose-passive' },
    ];
    const p = tableProfile(opps);
    expect(p.label).toBe('松弱桌');
    expect(p.adjustments.length).toBeGreaterThan(0);
    expect(adjustAdvice('fold', true, p, true)).toContain('诈唬');   // 修正提示
  });
  it('对手不足2人 → 无画像', () => {
    expect(tableProfile([{ type: 'TAG' }])).toBe(null);
  });
  it('开关关闭不修正', () => {
    const p = tableProfile([{ type: 'loose-passive' }, { type: 'loose-passive' }]);
    expect(adjustAdvice('fold', true, p, false)).toBe('');
  });
});
```

- [ ] **Step 2: 跑失败 → Step 3: 实现**

`implied.js`：
```js
import { TYPE_DEFAULTS } from './ranges.js';
// 未来回合预期投入系数（占底池比例）：跟注站敢跟→高隐含赔率
const FUTURE_FACTOR = { 'loose-passive': 1.0, 'LAG': 0.6, 'TAG': 0.5, 'tight-passive': 0.4 };
export function impliedOdds(call, pot, opponentType) {
  const future = pot * (FUTURE_FACTOR[opponentType] ?? 0.5);
  const required = call / (pot + call + future);
  return { future: +future.toFixed(1), required: +required.toFixed(3) };
}
```

`tableDynamics.js`：
```js
import { TYPE_DEFAULTS } from './ranges.js';

export function tableProfile(opponents) {
  if (!opponents || opponents.length < 2) return null;
  const vpipOf = o => {
    const d = TYPE_DEFAULTS[o.type] ?? TYPE_DEFAULTS.TAG;
    return (o.handsSeen >= 20 && o.vpipObs > 0) ? o.vpipObs : d.vpip;
  };
  const aggrOf = o => (TYPE_DEFAULTS[o.type] ?? TYPE_DEFAULTS.TAG).aggression;
  const vpipAvg = opponents.reduce((a, o) => a + vpipOf(o), 0) / opponents.length;
  const aggrAvg = opponents.reduce((a, o) => a + aggrOf(o), 0) / opponents.length;
  const loose = vpipAvg > 35, tight = vpipAvg < 25, aggro = aggrAvg >= 50;
  let label = '均衡', adjustments = [];
  if (loose && !aggro) { label = '松弱桌';
    adjustments = ['紧凶化：诈唬类建议频率下调（×0.6）', '薄价值放宽：更多小价值下注', '大注榨取：对跟注站用大尺寸']; }
  else if (tight && !aggro) { label = '紧弱桌';
    adjustments = ['松凶化：偷盲与诈唬频率上调（×1.4）', '对手弃牌率上调：更频繁施压']; }
  else if (tight && aggro) { label = '紧凶桌';
    adjustments = ['尊重反击：3bet频率上调', '防守收窄：面对加注少跟注']; }
  else if (loose && aggro) { label = '松凶桌';
    adjustments = ['控池防守：对抗加注跟注标准收紧', '少诈唬：对手不轻易弃牌']; }
  return { label, vpipAvg: +vpipAvg.toFixed(0), aggrAvg: +aggrAvg.toFixed(0), adjustments };
}

export function adjustAdvice(adviceLevel, isBluffish, profile, enabled) {
  if (!enabled || !profile || !isBluffish) return '';
  if (profile.label === '松弱桌' && adviceLevel === 'fold') return '桌子画像：松弱桌砍掉该类诈唬';
  if (profile.label === '紧弱桌' && (adviceLevel === 'fold' || adviceLevel === 'neutral')) return '桌子画像：紧弱桌可放宽诈唬';
  if (profile.label === '松凶桌' && adviceLevel !== 'raise') return '桌子画像：松凶桌收紧跟注标准';
  if (profile.label === '紧凶桌' && adviceLevel === 'call') return '桌子画像：紧凶桌防守应收窄';
  return '';
}
```

- [ ] **Step 4: 跑测试** → 全绿
- [ ] **Step 5: Commit** `git commit -m "feat(strategy): implied odds + table dynamics adapter"`，更新 CLAUDE.md。**阶段B完成**：策略层8模块齐了（rankTable/charts/ranges/texture/mdf/sizing/implied/tableDynamics）。

---

# 阶段C：手机 UI（<1024px 四标签）

### Task 15: 设计令牌 + 应用骨架 + 标签路由 + state store

**Files:**
- Create: `texas-web/src/style.css`, `texas-web/src/state.js`, `texas-web/src/main.js`（重写）, `texas-web/src/ui/tabs.js`, `texas-web/src/state.test.js`

**Interfaces:**
- Produces:
```js
// state.js
export const state;                       // 单一可变对象
export function setPatch(patch);          // 合并并广播
export function subscribe(fn);            // 返回取消函数
// state 初始键：hand:[], board:[], playerCount:6, heroPosition:'', raisesBefore:0, limpers:0,
// opponents:[{id,type,looseness,aggression,handsSeen,vpipObs,name}], pot:0, call:0, myStack:100, oppStack:100,
// sessionId:'', settings:{simulations:2000, adviceStyle:'standard', autoTableAdaptation:true, theme:'dark'},
// result:null, strategy:null
```

- [ ] **Step 1: 写 style.css 设计令牌与基础布局**

```css
:root {
  --bg: #0d1117; --bg-card: #161b22; --bg-hover: #1c2129;
  --border: #30363d; --text: #e6edf3; --text-dim: #8b949e;
  --accent: #22c55e; --accent-dim: #16a34a; --danger: #f85149;
  --warn: #d29922; --blue: #58a6ff; --orange: #f0883e;
  --mono: Consolas, ui-monospace, monospace;
  --sans: system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--bg); color: var(--text); font-family: var(--sans); font-size: 15px; }
button, .tap { min-height: 44px; }                     /* 触控目标约束 */
.card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 12px; margin: 8px; }
.num { font-family: var(--mono); font-variant-numeric: tabular-nums; }
#tabbar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; background: var(--bg-card); border-top: 1px solid var(--border); z-index: 10; }
#tabbar button { flex: 1; background: none; border: none; color: var(--text-dim); font-size: 13px; padding: 8px 0; }
#tabbar button.active { color: var(--accent); }
.page { display: none; padding-bottom: 64px; }
.page.active { display: block; }
@media (min-width: 1024px) { #tabbar { display: none; } }   /* 电脑端在 Task 25 扩展 */
```

- [ ] **Step 2: 写 state.js + 测试**

```js
const listeners = new Set();
export const state = {
  hand: [], board: [], playerCount: 6, heroPosition: '', raisesBefore: 0, limpers: 0,
  opponents: [], pot: 0, call: 0, myStack: 100, oppStack: 100,
  sessionId: '', settings: { simulations: 2000, adviceStyle: 'standard', autoTableAdaptation: true, theme: 'dark' },
  result: null, strategy: null,
};
export function setPatch(patch) { Object.assign(state, patch); listeners.forEach(fn => fn(state)); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
```
测试 `state.test.js`：
```js
import { describe, it, expect, vi } from 'vitest';
import { state, setPatch, subscribe } from './state.js';
describe('state', () => {
  it('patch 合并与广播', () => {
    const fn = vi.fn(); const off = subscribe(fn);
    setPatch({ pot: 100 });
    expect(state.pot).toBe(100); expect(fn).toHaveBeenCalled();
    off(); setPatch({ pot: 0 });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: tabs.js + main.js 骨架**

`src/ui/tabs.js`：
```js
const PAGES = [
  { id: 'calc', label: '计算' }, { id: 'gto', label: 'GTO图' },
  { id: 'history', label: '历史' }, { id: 'settings', label: '设置' },
];
export function renderTabbar(container, onSwitch) {
  container.innerHTML = '';
  for (const p of PAGES) {
    const b = document.createElement('button');
    b.textContent = p.label; b.dataset.page = p.id;
    b.addEventListener('click', () => onSwitch(p.id));
    container.appendChild(b);
  }
}
export function switchPage(id) {
  document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.id === 'page-' + id));
  document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('active', b.dataset.page === id));
}
```
`src/main.js`：
```js
import './style.css';
import { renderTabbar, switchPage } from './ui/tabs.js';
document.getElementById('app').innerHTML = `
  <header id="topbar" class="card"><b>♠ 德扑助手</b> <span id="street-badge" class="num"></span></header>
  <main id="page-calc" class="page active"></main>
  <main id="page-gto" class="page"></main>
  <main id="page-history" class="page"></main>
  <main id="page-settings" class="page"></main>
  <nav id="tabbar"></nav>`;
renderTabbar(document.getElementById('tabbar'), switchPage);
switchPage('calc');
```

- [ ] **Step 4: 跑测试 + 手动检查**：`npm run test` 全绿；`npm run dev` 打开浏览器可见底部4标签可切换。
- [ ] **Step 5: Commit** `git commit -m "feat(ui): design tokens, app shell, tab router, state store"`，更新 CLAUDE.md。

---

### Task 16: cardPicker + potForm（选牌器与底池输入）

**Files:**
- Create: `texas-web/src/ui/cardPicker.js`, `texas-web/src/ui/potForm.js` 及测试

**Interfaces:**
- Consumes: state.js
- Produces:
```js
// cardPicker.js
export function renderCardPicker(container, { slots, usedCards, onPick, title });
// slots: 需选张数；usedCards: 已占用牌（置灰）；onPick(cards: string[]) 完整时回调
// UI：13×4点数-花色网格（行=rank，列=shdc），已用牌禁点；顶部显示已选
export function clearCards();
// potForm.js
export function renderPotForm(container, onChange);  // onChange({pot,call,myStack,oppStack})
// 校验：数字≥0、call≤min(myStack,oppStack)；非法→红框+提示，onChange传NaN
```

- [ ] **Step 1: 失败测试**（jsdom 断言交互逻辑）

```js
import { describe, it, expect } from 'vitest';
import { renderCardPicker } from './cardPicker.js';
describe('cardPicker', () => {
  it('选满张数后回调，重复牌置灰', () => {
    document.body.innerHTML = '<div id="cp"></div>';
    let picked = null;
    renderCardPicker(document.getElementById('cp'), {
      slots: 2, usedCards: ['As'], onPick: c => (picked = c),
    });
    const btns = [...document.querySelectorAll('#cp button[data-card]')];
    expect(btns.find(b => b.dataset.card === 'As').disabled).toBe(true);
    btns.find(b => b.dataset.card === 'Ks').click();
    btns.find(b => b.dataset.card === 'Qd').click();
    expect(picked).toEqual(['Ks', 'Qd']);
  });
});
import { renderPotForm } from './potForm.js';
describe('potForm', () => {
  it('非法输入传NaN并红框', () => {
    document.body.innerHTML = '<div id="pf"></div>';
    let v = null;
    renderPotForm(document.getElementById('pf'), x => (v = x));
    const pot = document.querySelector('#pf input[name=pot]');
    pot.value = '-5'; pot.dispatchEvent(new Event('input'));
    expect(v.pot).toBeNaN();
    expect(pot.classList.contains('invalid')).toBe(true);
  });
});
```

- [ ] **Step 2: 跑失败 → Step 3: 实现**

`cardPicker.js`：
```js
const RANKS = 'AKQJT98765432'.split('');
const SUITS = [['s','♠'],['h','♥'],['d','♦'],['c','♣']];
let picked = [];

export function renderCardPicker(container, { slots, usedCards = [], onPick, title = '' }) {
  picked = [];
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div class="card"><div class="dim">${title}</div><div class="picked num"></div><div class="grid"></div></div>`;
  const grid = wrap.querySelector('.grid');
  const pickedEl = wrap.querySelector('.picked');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(13, 1fr)';
  grid.style.gap = '4px';
  for (const r of RANKS) for (const [s, sym] of SUITS) {
    const card = r + s;
    const b = document.createElement('button');
    b.dataset.card = card;
    b.innerHTML = `${r}<br>${sym}`;
    b.style.minWidth = '30px';
    if (usedCards.includes(card)) { b.disabled = true; b.style.opacity = 0.3; }
    b.addEventListener('click', () => {
      if (picked.includes(card) || picked.length >= slots) return;
      picked.push(card);
      b.disabled = true;
      pickedEl.textContent = picked.join(' ');
      if (picked.length === slots) onPick([...picked]);
    });
    grid.appendChild(b);
  }
  container.appendChild(wrap);
}
export function clearCards() { picked = []; }

// potForm.js
export function renderPotForm(container, onChange) {
  container.innerHTML = '';
  const fields = [
    ['pot', '底池'], ['call', '需跟注'], ['myStack', '我的筹码'], ['oppStack', '对手筹码'],
  ];
  const wrap = document.createElement('div');
  wrap.className = 'card';
  for (const [name, label] of fields) {
    const row = document.createElement('label');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 0;';
    row.innerHTML = `<span>${label}</span><input name="${name}" type="number" inputmode="decimal"
      style="width:110px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:8px;" />`;
    wrap.appendChild(row);
  }
  container.appendChild(wrap);
  const read = () => {
    const v = {};
    for (const [name] of fields) {
      const el = wrap.querySelector(`input[name=${name}]`);
      const n = parseFloat(el.value);
      const ok = !isNaN(n) && n >= 0;
      el.classList.toggle('invalid', !ok);
      el.style.borderColor = ok ? 'var(--border)' : 'var(--danger)';
      v[name] = ok ? n : NaN;
    }
    onChange(v);
  };
  wrap.addEventListener('input', read);
}
```
（`.invalid` 样式加进 style.css：`.invalid { border-color: var(--danger) !important; }`）

- [ ] **Step 4: 跑测试** → 全绿
- [ ] **Step 5: Commit** `git commit -m "feat(ui): card picker grid + pot form with validation"`，更新 CLAUDE.md。

---

### Task 17: positionBar + opponentCards（位置/场景/对手档案）

**Files:**
- Create: `texas-web/src/ui/positionBar.js`, `texas-web/src/ui/opponentCards.js` 及测试

**Interfaces:**
- Consumes: state.js；TYPE_DEFAULTS（ranges.js）
- Produces:
```js
// positionBar.js
export function positionsFor(playerCount);   // 2→['BTN','SB'] 3→['BTN','SB','BB'] 4→['CO','BTN','SB','BB'] 5→['MP',...] 6→['UTG','MP','CO','BTN','SB','BB'] 7-9→前插 UTG1/MP1
export function renderPositionBar(container, onChange);
// chips 选择 + steppers：加注数(0/1/2)、平跟人数(0-3)
// opponentCards.js
export function renderOpponentCards(container, { opponents, onEdit, onAdd, onPreset });
// 横滑卡片列表：类型徽章+VPIP观察值；「＋」「一键全员预设」按钮
export function opponentDefaults(type);      // 新建档案默认值（来自 TYPE_DEFAULTS）
```

- [ ] **Step 1: 失败测试**

```js
import { describe, it, expect } from 'vitest';
import { positionsFor } from './positionBar.js';
describe('positionsFor', () => {
  it('人数映射', () => {
    expect(positionsFor(2)).toEqual(['BTN', 'SB']);
    expect(positionsFor(4)).toEqual(['CO', 'BTN', 'SB', 'BB']);
    expect(positionsFor(6)).toEqual(['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB']);
    expect(positionsFor(9).length).toBe(9);
  });
});
import { opponentDefaults } from './opponentCards.js';
describe('opponentDefaults', () => {
  it('来自类型默认', () => {
    const d = opponentDefaults('LAG');
    expect(d.looseness).toBe(62);
  });
});
```

- [ ] **Step 2: 跑失败 → Step 3: 实现**

`positionBar.js`：
```js
const BASE = ['UTG', 'UTG1', 'MP', 'MP1', 'CO', 'BTN', 'SB', 'BB'];
export function positionsFor(playerCount) {
  if (playerCount <= 2) return ['BTN', 'SB'];
  const n = Math.min(9, Math.max(2, playerCount));
  const arr = BASE.slice(9 - n + 1);      // 取后 n-1 个动作位 + BB
  // 修正：BB 已在 BASE；上面切片保证长度 n-1（不含BTN? 自查）
  // 直接实现：
  const tail = ['CO', 'BTN', 'SB', 'BB'];
  const early = ['UTG', 'UTG1', 'MP', 'MP1'];
  if (n === 3) return ['BTN', 'SB', 'BB'];
  const earlyCount = n - tail.length;       // 4人→0, 6人→2
  return [...early.slice(early.length - Math.max(0, earlyCount)), ...tail];
}

export function renderPositionBar(container, onChange) {
  // 渲染位置 chips（从 state.playerCount）+ 两个 stepper
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'card';
  wrap.innerHTML = `<div class="pos-chips" style="display:flex;flex-wrap:wrap;gap:6px;"></div>
    <div class="scenarios" style="display:flex;gap:16px;margin-top:8px;">
      <label>行动前加注 <button class="stp" data-k="raisesBefore" data-d="-1">−</button><b class="num" id="rb-val"></b><button class="stp" data-k="raisesBefore" data-d="1">＋</button></label>
      <label>平跟人数 <button class="stp" data-k="limpers" data-d="-1">−</button><b class="num" id="lp-val"></b><button class="stp" data-k="limpers" data-d="1">＋</button></label>
    </div>`;
  container.appendChild(wrap);
  const chips = wrap.querySelector('.pos-chips');
  const renderChips = (positions, current) => {
    chips.innerHTML = '';
    for (const p of positions) {
      const b = document.createElement('button');
      b.textContent = p; b.className = p === current ? 'chip active' : 'chip';
      b.style.cssText = 'border:1px solid var(--border);border-radius:999px;padding:4px 12px;background:' +
        (p === current ? 'var(--accent)' : 'var(--bg)') + ';color:' + (p === current ? '#000' : 'var(--text-dim)');
      b.addEventListener('click', () => onChange({ heroPosition: p }));
      chips.appendChild(b);
    }
  };
  wrap.addEventListener('click', e => {
    const b = e.target.closest('.stp'); if (!b) return;
    const k = b.dataset.k, d = +b.dataset.d;
    const limits = { raisesBefore: [0, 2], limpers: [0, 3] };
    const [lo, hi] = limits[k];
    onChange({ [k]: Math.min(hi, Math.max(lo, window.stateValue?.(k) ?? 0 + d)) });
  });
  return { renderChips };
}
```
（stepper 读写当前值改经 state 订阅，实现时以 state.js 为准：onChange 交由整合层把新值写回 state 后重渲染。）

`opponentCards.js`：
```js
import { TYPE_DEFAULTS } from '../strategy/ranges.js';
export function opponentDefaults(type) {
  const d = TYPE_DEFAULTS[type] ?? TYPE_DEFAULTS.TAG;
  return { id: 'opp-' + Math.random().toString(36).slice(2, 8), name: '', type,
           looseness: d.looseness, aggression: d.aggression, handsSeen: 0, vpipObs: null };
}
const TYPE_LABEL = { TAG: '紧凶', LAG: '松凶', 'tight-passive': '紧弱', 'loose-passive': '松弱' };
export function renderOpponentCards(container, { opponents, onEdit, onAdd, onPreset }) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'card';
  wrap.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;">
      <b>对手档案</b><span><button id="opp-preset">一键全员预设</button> <button id="opp-add">＋</button></span></div>
    <div class="opp-list" style="display:flex;overflow-x:auto;gap:8px;padding:8px 0;"></div>`;
  container.appendChild(wrap);
  const list = wrap.querySelector('.opp-list');
  for (const o of opponents) {
    const card = document.createElement('button');
    card.style.cssText = 'min-width:120px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);padding:8px;';
    card.innerHTML = `<b>${o.name || TYPE_LABEL[o.type]}</b><br><small>${TYPE_LABEL[o.type] ?? o.type}
      ${o.handsSeen >= 20 && o.vpipObs ? ' · VPIP ' + o.vpipObs + '%' : ''}</small>`;
    card.addEventListener('click', () => onEdit(o));
    list.appendChild(card);
  }
  wrap.querySelector('#opp-add').addEventListener('click', () => onAdd());
  wrap.querySelector('#opp-preset').addEventListener('click', () => onPreset());
}
```

- [ ] **Step 4: 跑测试** → 全绿
- [ ] **Step 5: Commit** `git commit -m "feat(ui): position bar, preflop scenario steppers, opponent profile cards"`，更新 CLAUDE.md。

---

### Task 18: calc.js 整合 + resultPanel（计算主流程）

**Files:**
- Create: `texas-web/src/calc.js`, `texas-web/src/ui/resultPanel.js`, `texas-web/src/calc.test.js`
- Modify: `texas-web/src/main.js`（计算页装配）

**Interfaces:**
- Consumes: Task 3 getCore；Task 10 maskForOpponent；Task 7 evaluateDecision；Task 9 isShort/getPreflopChart
- Produces:
```js
// calc.js
export async function recalc();   // 读 state → 掩码 → WASM → 决策 → 写 state.result / state.strategy；异常时 result={error}
// state.result 形状：
// { winRate, tieRate, lossRate, eff, evCall, evRaise, potOdds, requiredEquity, advice, adviceLevel, rangeStats, error? }
export function effectiveStack();         // min(myStack, oppStack)
export function streetOf(board);          // ''|'翻前'|'翻牌'|'转牌'|'河牌'
// resultPanel.js
export function renderResult(container, result);
// WIN RATE 大数字 + 优势进度条 + EV双卡 + 建议横幅（含错误态："加载计算引擎失败，请刷新"）
```

- [ ] **Step 1: 失败测试**（streetOf/effectiveStack 纯逻辑 + recalc 错误路径）

```js
import { describe, it, expect } from 'vitest';
import { streetOf, effectiveStack } from './calc.js';
describe('calc helpers', () => {
  it('streetOf', () => {
    expect(streetOf([])).toBe('翻前');
    expect(streetOf(['As','Kd','7h'])).toBe('翻牌');
    expect(streetOf(['As','Kd','7h','2c'])).toBe('转牌');
    expect(streetOf(['As','Kd','7h','2c','9s'])).toBe('河牌');
  });
  it('有效筹码取小', () => { expect(effectiveStack(80, 120)).toBe(80); });
});
```

- [ ] **Step 2: 跑失败 → Step 3: 实现 calc.js**

```js
import { state, setPatch } from './state.js';
import { getCore } from './wasm/pokerCore.js';
import { maskForOpponent } from './strategy/ranges.js';
import { isShort } from './strategy/charts.js';

export function streetOf(board) {
  if (!board.length) return '翻牌前'.replace('牌', ''); // 翻前
  return ['', '翻前', '', '翻牌', '转牌', '河牌'][board.length] ?? '';
}
// ↑ 简化：直接实现为 switch(board.length){0/1/2:'翻前';3:'翻牌';4:'转牌';5:'河牌'}
export function effectiveStack(my = state.myStack, opp = state.oppStack) {
  return Math.min(my, opp);
}

export async function recalc() {
  try {
    if (state.hand.length !== 2 || state.opponents.length === 0) { setPatch({ result: null }); return; }
    const core = await getCore();
    const ctxBase = { role: state.raisesBefore > 0 ? 'defend' : 'open', effectiveStackBB: effectiveStack() / Math.max(1, state.pot / 10) };
    const masks = state.opponents.map(o => maskForOpponent(o, {
      position: o.type ? 'MP' : 'MP', role: ctxBase.role, effectiveStackBB: 100,
    }).mask);
    const r = core.calculateEquityV2(state.hand, state.board, masks.map(m => Array.from(m)), state.settings.simulations);
    const eff = r.winRate + r.tieRate * 0.5;
    const d = core.evaluateDecision(eff, state.pot, state.call,
      state.pot * 0.5 + state.call, state.settings.adviceStyle);
    setPatch({ result: { ...r, eff, ...d } });
  } catch (e) {
    setPatch({ result: { error: '加载计算引擎失败，请刷新' } });
  }
}
```
（实现时修正 streetOf 为清晰 switch；BB 换算 effectiveStackBB=effStack/bigBlind，bigBlind 由设置推断或用 pot 近似——以 UI 接线为准，此处 effectiveStackBB 传 effStack/(pot||10)*10 允许实现期统一为 `effStack / bigBlind`，bigBlind 缺省 10。）

`resultPanel.js`：
```js
import { state } from '../state.js';
export function renderResult(container, result) {
  container.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'card';
  if (!result) { el.innerHTML = '<div class="dim">选好手牌后自动计算</div>'; container.appendChild(el); return; }
  if (result.error) { el.innerHTML = `<div style="color:var(--danger)">${result.error}</div>`; container.appendChild(el); return; }
  const pct = (result.eff * 100).toFixed(1);
  el.innerHTML = `
    <div style="font-size:12px;color:var(--text-dim)">WIN RATE（含平局×½）</div>
    <div class="num" style="font-size:40px;color:${result.eff >= 0.5 ? 'var(--accent)' : 'var(--text)'}">${pct}%</div>
    <div style="height:8px;background:var(--bg);border-radius:4px;overflow:hidden">
      <div style="width:${pct}%;height:100%;background:var(--accent)"></div></div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <div class="card" style="flex:1">跟注EV<div class="num">${result.evCall.toFixed(1)}</div></div>
      <div class="card" style="flex:1">加注EV<div class="num">${result.evRaise.toFixed(1)}</div></div>
    </div>
    <div style="margin-top:8px;padding:10px;border-radius:8px;background:var(--bg);border:1px solid var(--border)">
      建议：<b>${result.advice}</b> <span class="num dim">需胜率 ${(result.requiredEquity * 100).toFixed(1)}%</span>
    </div>`;
  container.appendChild(el);
}
```

- [ ] **Step 4: 跑测试** → 全绿；`npm run dev` 手动走查：选2张牌→出现胜率。
- [ ] **Step 5: Commit** `git commit -m "feat(ui): recalc orchestrator + result dashboard"`，更新 CLAUDE.md。

---

### Task 19: strategyPanel + tableProfile 横幅 + 计算页完整装配

**Files:**
- Create: `texas-web/src/ui/strategyPanel.js`, `texas-web/src/ui/tableProfile.js`
- Modify: `texas-web/src/main.js`, `texas-web/src/calc.js`（策略组装并入 recalc）

**Interfaces:**
- Consumes: texture/mdf/sizing/implied/tableDynamics/rankTable/charts 全部
- Produces: 计算页自上而下完整：桌子画像横幅 → 手牌/公共牌 → 位置条 → 对手卡 → 底池表单 → 结果 → 策略卡片组 → 「✓ 记录本手到历史」按钮（记录逻辑 Task 21 接）
- `state.strategy` 形状：`{ texture, cBet, spr, mdf, outs, implied, percentileText, tableAdjustText, gtoKind, gtoTitle }`

- [ ] **Step 1: 策略组装（calc.js 内新增 buildStrategy 函数）**

```js
import { analyzeTexture } from './strategy/texture.js';
import { mdfAlpha, detectOuts, outsToEquity } from './strategy/mdf.js';
import { cBetSuggestion, sprInfo, riverValueBluffRatio, defendAdvice } from './strategy/sizing.js';
import { impliedOdds } from './strategy/implied.js';
import { tableProfile, adjustAdvice } from './strategy/tableDynamics.js';
import { percentile } from './strategy/rankTable.js';
import { handClassFor, isShort, getPreflopChart } from './strategy/charts.js';

export function buildStrategy() {
  const tex = state.board.length >= 3 ? analyzeTexture(state.board) : null;
  const effStack = effectiveStack();
  const spr = state.pot > 0 ? sprInfo(effStack, state.pot) : null;
  const mdf = state.call > 0 ? mdfAlpha(state.call, state.pot) : null;
  const outs = state.board.length === 3 || state.board.length === 4 ? detectOuts(state.hand, state.board) : null;
  const oppType = state.opponents[0]?.type ?? 'TAG';
  const implied = outs && outs.outs > 0 ? impliedOdds(state.call, state.pot, oppType) : null;
  const profile = tableProfile(state.opponents);
  const heroCls = handClassFor(state.hand);
  const pct = percentile(heroCls);
  const effBB = effStack / 10;   // bigBlind=10 约定
  const short = isShort(effBB);
  const gto = getPreflopChart({
    position: state.heroPosition, raiserPosition: '', role: state.raisesBefore > 0 ? 'defend' : 'open',
    effectiveStackBB: effBB,
  });
  const isBluffish = state.result ? state.result.eff < 0.4 : false;
  const adjust = adjustAdvice(state.result?.adviceLevel, isBluffish, profile, state.settings.autoTableAdaptation);
  return { texture: tex, cBet: tex ? cBetSuggestion(tex.label, state.settings.adviceStyle) : null,
           spr, mdf, outs, implied, profile, adjust,
           percentileText: `${heroCls} 排名前 ${pct}/169`,
           gtoTitle: gto.title };
}
```

- [ ] **Step 2: strategyPanel.js / tableProfile.js**

```js
// strategyPanel.js
export function renderStrategyPanel(container, s) {
  container.innerHTML = '';
  const cards = [];
  if (s?.profile) cards.push(['🎯 全桌画像：' + s.profile.label + '（VPIP≈' + s.profile.vpipAvg + '%）', s.profile.adjustments.join('；')]);
  if (s?.adjust) cards.push(['桌子动态修正', s.adjust]);
  if (s?.texture) cards.push(['牌面纹理：' + s.texture.label, s.texture.features.join(' · ') || '无特征']);
  if (s?.cBet) cards.push(['c-bet 建议 ' + Math.round(s.cBet.pct * 100) + '%池（' + s.cBet.freq + '频率）', s.cBet.reason]);
  if (s?.spr) cards.push(['SPR ' + s.spr.spr, s.spr.note]);
  if (s?.mdf) cards.push(['MDF ' + Math.round(s.mdf.mdf * 100) + '% / α ' + Math.round(s.mdf.alpha * 100) + '%', '防守至少 MDF 比例才不被无成本诈唬击穿']);
  if (s?.outs && s.outs.outs > 0) cards.push(['听牌 outs ' + s.outs.outs + '（' + Math.round(outsEq(s) * 100) + '%）', s.outs.draws.join(' · ')]);
  if (s?.implied) cards.push(['隐含赔率：需胜率 ' + Math.round(s.implied.required * 100) + '%', '考虑后手回合对手预期投入 ' + s.implied.future]);
  if (s?.percentileText) cards.push(['起手牌百分位', s.percentileText]);
  if (s?.gtoTitle) cards.push(['GTO 对照', s.gtoTitle + (s.gtoKind?.startsWith('nash') ? '（短码 Nash 模式）' : '')]);
  for (const [title, body] of cards) {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `<b>${title}</b><div class="dim" style="margin-top:4px">${body}</div>`;
    container.appendChild(el);
  }
  function outsEq(s) { return outsToEquity(s.outs.outs, state.board.length === 3 ? 2 : 1); }
}
// tableProfile.js
import { tableProfile } from '../strategy/tableDynamics.js';
import { TYPE_DEFAULTS } from '../strategy/ranges.js';
export function renderTableProfile(container, opponents, autoOn) {
  const p = tableProfile(opponents);
  container.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'card';
  if (!p) { el.innerHTML = '<span class="dim">🎯 均衡（对手≥2人后显示全桌画像）</span>'; }
  else {
    const color = p.label.includes('松') ? 'var(--orange)' : 'var(--blue)';
    el.innerHTML = `<span style="color:${color}">🎯 ${p.label}（VPIP≈${p.vpipAvg}%）</span>
      <span class="dim">${autoOn ? '→ ' + p.adjustments[0] : '（自动适配已关闭，仅显示不修正）'}</span>`;
  }
  container.appendChild(el);
}
```

- [ ] **Step 3: main.js 装配计算页**（选牌→状态→订阅重算重渲染；对手编辑抽屉用 `<dialog>`：类型快选4档+两维滑条+名称；「一键全员预设」= 全员设为所选类型；公共牌选满3张才显示纹理卡）

装配代码（main.js 主体，整合层）：
```js
import { state, setPatch, subscribe } from './state.js';
import { recalc, buildStrategy } from './calc.js';
import { renderCardPicker } from './ui/cardPicker.js';
import { renderPotForm } from './ui/potForm.js';
import { renderPositionBar, positionsFor } from './ui/positionBar.js';
import { renderOpponentCards, opponentDefaults } from './ui/opponentCards.js';
import { renderResult } from './ui/resultPanel.js';
import { renderStrategyPanel } from './ui/strategyPanel.js';
import { renderTableProfile } from './ui/tableProfile.js';

const calcPage = document.getElementById('page-calc');
function renderCalc() {
  calcPage.innerHTML = '';
  renderTableProfile(add('div'), state.opponents, state.settings.autoTableAdaptation);
  // 手牌/公共牌选择器（已选牌互斥置灰）
  const used = [...state.hand, ...state.board];
  renderCardPicker(add('div'), { slots: 2, usedCards: used.filter(c => !state.hand.includes(c)), title: '我的手牌', onPick: cards => { setPatch({ hand: cards }); refresh(); } });
  renderCardPicker(add('div'), { slots: 5, usedCards: used.filter(c => !state.board.includes(c)), title: '公共牌（3/4/5张随街填写，翻前可不填）', onPick: cards => { setPatch({ board: cards }); refresh(); } });
  renderPositionBar(add('div'), patch => { setPatch(patch); refresh(); });
  renderOpponentCards(add('div'), {
    opponents: state.opponents,
    onAdd: () => { setPatch({ opponents: [...state.opponents, opponentDefaults('TAG')] }); refresh(); },
    onPreset: () => { setPatch({ opponents: state.opponents.map(o => ({ ...o, type: 'TAG', looseness: 35, aggression: 60 })) }); refresh(); },
    onEdit: o => openOpponentDrawer(o),
  });
  renderPotForm(add('div'), v => { setPatch(v); refresh(); });
  renderResult(add('div'), state.result);
  renderStrategyPanel(add('div'), state.strategy);
  const rec = document.createElement('button');
  rec.textContent = '✓ 记录本手到历史';
  rec.style.cssText = 'width:calc(100% - 16px);margin:8px;background:var(--accent);border:none;border-radius:10px;color:#000;font-weight:700;';
  rec.addEventListener('click', () => window.__recordHand?.());
  calcPage.appendChild(rec);
  function add(tag) { const d = document.createElement(tag); calcPage.appendChild(d); return d; }
}
function refresh() { renderCalc(); recalc().then(() => setPatch({ strategy: buildStrategy() })); }
subscribe(() => { /* 订阅仅触发计算页内数据刷新标记，避免死循环：refresh 由交互显式调用 */ });
// 对手编辑抽屉：<dialog> 4类型快选 + looseness/aggression 双滑条 + 名称输入 + 保存/删除
function openOpponentDrawer(o) { /* ...实现：dialog 元素动态创建，保存时 setPatch 替换该对象后 refresh() */ }
renderCalc();
```
（`openOpponentDrawer` 实现代码在执行时补全：结构= dialog > 名称input + 4个类型按钮 + 两个 range 滑条 + 删除/保存按钮；保存回调 `setPatch({opponents: state.opponents.map(x => x.id===o.id? {...x, ...form}: x)}); refresh()`；删除同理 filter。类型按钮点击时把 looseness/aggression 滑条同步为 TYPE_DEFAULTS 值。）

- [ ] **Step 4: 手动走查（F12 iPhone SE 视口）**：选牌互斥置灰 ✓ 位置chips随人数变化 ✓ 对手增删/预设 ✓ 输入非法红框 ✓ 胜率与策略卡出现 ✓ <1024px 单列 ✓
- [ ] **Step 5: Commit** `git commit -m "feat(ui): full calc page assembly with strategy panel and table profile banner"`，更新 CLAUDE.md。

---

### Task 20: handMatrix 复用组件 + GTO图页

**Files:**
- Create: `texas-web/src/ui/handMatrix.js`, `texas-web/src/ui/chartViewer.js`, `texas-web/src/ui/handMatrix.test.js`

**Interfaces:**
- Consumes: charts.js（getPreflopChart/gridCell/C(i,j) 类名规则）
- Produces:
```js
// handMatrix.js — 三处复用：GTO页全尺寸 / 策略栏迷你 / 复盘卡
export function renderMatrix(container, { grid, mask, title, mini, highlight }); 
// grid: 'R|r|C|c|F' 动作表 或 mask: Uint8Array(169) 权重；highlight: 'AKs' 高亮格
// 颜色：R绿 r浅绿 C黄 c浅黄 F灰（透明度=强度）；mask 模式：透明度=权重，色=accent
// chartViewer.js
export function renderChartPage(container, scenario, onScenarioChange);
// 场景选择器（位置/角色/有效BB档位）默认跟随 state（"自动跟随计算页场景"）
```

- [ ] **Step 1: 失败测试**

```js
import { describe, it, expect } from 'vitest';
import { renderMatrix } from './handMatrix.js';
import { getPreflopChart } from '../strategy/charts.js';
describe('handMatrix', () => {
  it('13×13 格子，AA为绿、72o为灰', () => {
    document.body.innerHTML = '<div id="m"></div>';
    const chart = getPreflopChart({ position: 'BTN', role: 'open', effectiveStackBB: 100 });
    renderMatrix(document.getElementById('m'), { grid: chart.grid });
    const cells = [...document.querySelectorAll('#m [data-cell]')];
    expect(cells.length).toBe(169);
    expect(cells.find(c => c.dataset.cell === 'AA').style.background).toContain('34, 197, 94');
    expect(cells.find(c => c.dataset.cell === '72o').style.background).toContain('107, 114, 128');
  });
});
```

- [ ] **Step 2: 跑失败 → Step 3: 实现**

`handMatrix.js`：
```js
const RANKS = 'AKQJT98765432'.split('');
const COLOR = { R: 'rgba(34,197,94,1)', r: 'rgba(34,197,94,0.45)', C: 'rgba(234,179,8,1)',
                c: 'rgba(234,179,8,0.45)', F: 'rgba(107,114,128,0.25)' };
export function renderMatrix(container, { grid, mask, mini = false, highlight = '' }) {
  const RANKS_IDX = 'AKQJT98765432';
  const wrap = document.createElement('div');
  wrap.style.cssText = mini ? 'width:180px;' : 'width:100%;max-width:420px;margin:0 auto;';
  const g = document.createElement('div');
  g.style.cssText = `display:grid;grid-template-columns:repeat(13,1fr);gap:1px;aspect-ratio:1;font-size:${mini ? 6 : 10}px;`;
  const className = (row, col) => row === col ? RANKS_IDX[row] + RANKS_IDX[row]
    : col > row ? RANKS_IDX[row] + RANKS_IDX[col] + 's' : RANKS_IDX[col] + RANKS_IDX[row] + 'o';
  for (let row = 0; row < 13; row++) for (let col = 0; col < 13; col++) {
    const cls = className(row, col);
    const cell = document.createElement('div');
    cell.dataset.cell = cls;
    cell.style.cssText = 'display:flex;align-items:center;justify-content:center;border-radius:2px;color:#000;';
    if (grid) cell.style.background = COLOR[grid[row][col]] ?? COLOR.F;
    if (mask) {
      const w = mask[row * 13 + col];
      cell.style.background = `rgba(34,197,94,${w / 100})`;
      if (w === 0) cell.style.background = 'rgba(107,114,128,0.15)';
    }
    cell.textContent = mini ? '' : cls;
    if (cls === highlight) cell.style.outline = '2px solid #fff';
    g.appendChild(cell);
  }
  wrap.appendChild(g);
  if (!mini) {
    wrap.innerHTML += `<div class="dim" style="text-align:center;font-size:11px;margin-top:4px">
      <span style="color:#22c55e">■</span>加注 <span style="color:#eab308">■</span>跟注 <span style="color:#6b7280">■</span>弃牌（上三角同花/下三角异花）</div>`;
  }
  container.appendChild(wrap);
}
```

`chartViewer.js`：
```js
import { getPreflopChart } from '../strategy/charts.js';
import { renderMatrix } from './handMatrix.js';
import { state } from '../state.js';
const POS = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
export function renderChartPage(container, scenario, onScenarioChange) {
  container.innerHTML = '';
  const s = scenario ?? { position: state.heroPosition || 'BTN', role: state.raisesBefore > 0 ? 'defend' : 'open', effectiveStackBB: 100, raiserPosition: 'CO' };
  const bar = document.createElement('div');
  bar.className = 'card';
  bar.innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap">
    ${['open', 'defend'].map(r => `<button data-role="${r}" class="chip">${r === 'open' ? '开牌' : '防守'}</button>`).join('')}
    ${POS.map(p => `<button data-pos="${p}" class="chip">${p}</button>`).join('')}
    <select id="eff" class="num"><option>100</option><option>15</option><option>10</option><option>6</option></select>BB
  </div>`;
  container.appendChild(bar);
  bar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const next = { ...s };
    if (b.dataset.role) next.role = b.dataset.role;
    if (b.dataset.pos) next.position = b.dataset.pos;
    onScenarioChange(next);
  });
  bar.querySelector('#eff').addEventListener('change', e => onScenarioChange({ ...s, effectiveStackBB: +e.target.value }));
  const chart = getPreflopChart(s);
  const title = document.createElement('div');
  title.className = 'card';
  title.innerHTML = `<b>${chart.title}</b><div class="dim">${chart.note}</div>`;
  container.appendChild(title);
  const holder = document.createElement('div');
  holder.className = 'card';
  container.appendChild(holder);
  renderMatrix(holder, { grid: chart.grid });
}
```

- [ ] **Step 4: main.js 接 GTO 页**：`switchPage('gto')` 时 `renderChartPage(pageGto, null, s => renderChartPage(pageGto, s, ...))`；默认场景跟随 state（无选择时传 null）。
- [ ] **Step 5: 跑测试 + 手动走查**：测试全绿；GTO 页切场景 <50ms、热力图正确。
- [ ] **Step 6: Commit** `git commit -m "feat(ui): reusable 13x13 hand matrix + GTO chart page"`，更新 CLAUDE.md。

---

### Task 21: 设置页（精度/风格/桌子适配开关/清空/关于）

**Files:**
- Create: `texas-web/src/ui/settingsPage.js`

**Interfaces:**
- Consumes: state.settings
- Produces: 设置页完整渲染（导出/导入按钮占位 Task 23 接线）；关于卡含"学习与训练工具，不承诺盈利。理性游戏。"定位声明

- [ ] **Step 1: 实现**（纯 UI，无独立测试；由 Task 25 的全流程清单覆盖）

```js
import { state, setPatch } from '../state.js';
export function renderSettingsPage(container, { onExport, onImport, onClear }) {
  container.innerHTML = '';
  const mk = (title, inner) => { const d = document.createElement('div'); d.className = 'card';
    d.innerHTML = `<b>${title}</b><div style="margin-top:6px">${inner}</div>`; container.appendChild(d); return d; };
  mk('模拟精度', `<select id="s-sim">
      ${[500, 2000, 5000].map(n => `<option ${state.settings.simulations === n ? 'selected' : ''}>${n}</option>`).join('')}</select> 次`);
  mk('建议风格', `<select id="s-style">
      ${[['conservative', '保守'], ['standard', '标准'], ['aggressive', '激进']].map(([v, t]) =>
        `<option value="${v}" ${state.settings.adviceStyle === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`);
  mk('自动桌子适配', `<input type="checkbox" id="s-adapt" ${state.settings.autoTableAdaptation ? 'checked' : ''}/> 
      <span class="dim">根据全桌风格自动调整打法建议（不影响胜率数学）</span>`);
  mk('数据', `<button id="s-export">导出 JSON 备份</button> <button id="s-import">导入 JSON</button>
      <input type="file" id="s-file" accept=".json" style="display:none"/> <button id="s-clear" style="color:var(--danger)">清空历史</button>`);
  mk('关于', `<p class="dim">德扑助手 v4.0 — 面向学习与训练的工具，帮助你理解胜率、EV、底池赔率与GTO概念。
      不承诺盈利。图表为公开共识简化版。请理性游戏。</p>`);
  container.querySelector('#s-sim').addEventListener('change', e => setPatch({ settings: { ...state.settings, simulations: +e.target.value } }));
  container.querySelector('#s-style').addEventListener('change', e => setPatch({ settings: { ...state.settings, adviceStyle: e.target.value } }));
  container.querySelector('#s-adapt').addEventListener('change', e => setPatch({ settings: { ...state.settings, autoTableAdaptation: e.target.checked } }));
  container.querySelector('#s-export').addEventListener('click', onExport);
  container.querySelector('#s-import').addEventListener('click', () => container.querySelector('#s-file').click());
  container.querySelector('#s-file').addEventListener('change', e => e.target.files[0]?.text().then(onImport));
  container.querySelector('#s-clear').addEventListener('click', onClear);
}
```

- [ ] **Step 2: 手动走查 + Commit** `git commit -m "feat(ui): settings page"`，更新 CLAUDE.md。**阶段C完成**。

---

# 阶段D：数据层与复盘

### Task 22: storage.js（四键+FIFO）+ sessionBar + 记录本手

**Files:**
- Create: `texas-web/src/storage.js`, `texas-web/src/storage.test.js`, `texas-web/src/ui/sessionBar.js`

**Interfaces:**
- Consumes: state.js
- Produces:
```js
// storage.js — 键：texas.sessions / texas.hands / texas.opponents / texas.settings
export function loadAll();                    // 启动时读入 state（含降级：localStorage不可用→仅内存+console.warn）
export function saveHands(hands);             // FIFO 上限1000，超出从头丢弃
export function saveOpponents(list);
export function saveSettings(s);
export function saveSessions(list);
export function newSession(name);             // → session 对象并写入
export function buildHandRecord(action, result); // 汇集 state → HandRecord（设计§6结构）
export function updateOpponentObservation(oppId, sawVpip); // handsSeen+1，滚动VPIP=观察计数/手数
// sessionBar.js
export function renderSessionBar(container);  // 顶栏当前会话指示 + "开始新会话"
```
HandRecord 字段照设计§6：`{id,sessionId,timestamp,hand,board,street,preflopScenario{heroPosition,raisesBefore,limpers},inPosition,heroRole,opponents[{profileId,typeSnapshot,vpipSnapshot}],tableProfile,pot,call,myStack,oppStack,effectiveStack,winRate,tieRate,equity,evCall,evRaise,potOdds,requiredEquity,advice,adviceLevel,sizing,gtoAction,texture,strategyTags[],action,result,followedAdvice,deviationType?,tags[],notes}`

- [ ] **Step 1: 失败测试**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { saveHands, loadAll, buildHandRecord } from './storage.js';
describe('storage', () => {
  beforeEach(() => localStorage.clear());
  it('1000手FIFO', () => {
    const hands = Array.from({ length: 1002 }, (_, i) => ({ id: 'h' + i }));
    saveHands(hands);
    const { hands: stored } = loadAll();
    expect(stored.length).toBe(1000);
    expect(stored[0].id).toBe('h2');
    expect(stored.at(-1).id).toBe('h1001');
  });
  it('buildHandRecord 字段完整', () => {
    const r = buildHandRecord('call', { net: 12.5 });
    expect(r).toHaveProperty('hand');
    expect(r).toHaveProperty('effectiveStack');
    expect(r.timestamp).toBeTypeOf('number');
  });
});
```

- [ ] **Step 2: 跑失败 → Step 3: 实现**

```js
import { state } from './state.js';
const K = { sessions: 'texas.sessions', hands: 'texas.hands', opponents: 'texas.opponents', settings: 'texas.settings' };
function read(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { console.warn('存储不可用/已满，仅内存模式'); return false; } }
export function saveSessions(list) { write(K.sessions, list); }
export function saveHands(hands) { write(K.hands, hands.slice(-1000)); }   // FIFO
export function saveOpponents(list) { write(K.opponents, list); }
export function saveSettings(s) { write(K.settings, s); }
export function loadAll() {
  return {
    sessions: read(K.sessions, []), hands: read(K.hands, []),
    opponents: read(K.opponents, []), settings: read(K.settings, null),
  };
}
export function newSession(name) {
  const s = { id: 's-' + Date.now().toString(36), name: name || '会话', date: new Date().toISOString().slice(0, 10), handsCount: 0, netResult: 0, evTotal: 0 };
  const list = loadAll().sessions; list.push(s); saveSessions(list);
  return s;
}
export function buildHandRecord(action, result) {
  const strategy = state.strategy ?? {};
  return {
    id: 'h-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    sessionId: state.sessionId, timestamp: Date.now(),
    hand: [...state.hand], board: [...state.board], street: streetName(state.board.length),
    preflopScenario: { heroPosition: state.heroPosition, raisesBefore: state.raisesBefore, limpers: state.limpers },
    inPosition: ['BTN', 'CO', 'MP'].includes(state.heroPosition), heroRole: state.raisesBefore > 0 ? 'defender' : 'aggressor',
    opponents: state.opponents.map(o => ({ profileId: o.id, typeSnapshot: o.type, vpipSnapshot: o.vpipObs ?? null })),
    tableProfile: strategy.profile?.label ?? '均衡',
    pot: state.pot, call: state.call, myStack: state.myStack, oppStack: state.oppStack,
    effectiveStack: Math.min(state.myStack, state.oppStack),
    winRate: state.result?.winRate ?? 0, tieRate: state.result?.tieRate ?? 0,
    equity: state.result?.eff ?? 0, evCall: state.result?.evCall ?? 0, evRaise: state.result?.evRaise ?? 0,
    potOdds: state.result?.potOdds ?? 0, requiredEquity: state.result?.requiredEquity ?? 0,
    advice: state.result?.advice ?? '', adviceLevel: state.result?.adviceLevel ?? '',
    sizing: strategy.cBet?.pct ?? null, gtoAction: strategy.gtoTitle ?? '',
    texture: strategy.texture?.label ?? '', strategyTags: strategy.profile?.adjustments ?? [],
    action, result, followedAdvice: null, deviationType: null, tags: [], notes: '',
  };
  function streetName(n) { return n <= 2 ? 'preflop' : n === 3 ? 'flop' : n === 4 ? 'turn' : 'river'; }
}
export function updateOpponentObservation(oppId, sawVpip) {
  const list = loadAll().opponents.map(o => {
    if (o.id !== oppId) return o;
    const handsSeen = (o.handsSeen ?? 0) + 1;
    const vpipCount = ((o.vpipObs ?? 0) * (o.handsSeen ?? 0) / 100 | 0) + (sawVpip ? 1 : 0);
    return { ...o, handsSeen, vpipObs: Math.round(vpipCount / handsSeen * 100), updatedAt: Date.now() };
  });
  saveOpponents(list);
}
```

`sessionBar.js`：
```js
import { state, setPatch } from '../state.js';
import { newSession } from '../storage.js';
export function renderSessionBar(container) {
  container.innerHTML = state.sessionId
    ? `当前会话：<b>${state.sessionName ?? '进行中'}</b> <button id="new-session" style="margin-left:8px">开始新会话</button>`
    : `<button id="new-session">开始新会话</button> <span class="dim">记录前建议先开一个会话</span>`;
  container.querySelector('#new-session').addEventListener('click', () => {
    const s = newSession('会话 ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    setPatch({ sessionId: s.id, sessionName: s.name });
    renderSessionBar(container);
  });
}
```
main.js 顶栏接入 `renderSessionBar`；`window.__recordHand` = `() => { const rec = buildHandRecord('未记录', {net:0}); const {hands} = loadAll(); hands.push(rec); saveHands(hands); rec.textContent 提示'已记录' }`（执行时补全提示与对手观察值更新调用）。

- [ ] **Step 4: 跑测试** → 全绿；手动：记录一手→刷新页面数据仍在。
- [ ] **Step 5: Commit** `git commit -m "feat(data): localStorage 4-key storage with FIFO, sessions, hand records"`，更新 CLAUDE.md。

---

### Task 23: exporter.js 导出/导入 + 设置页接线

**Files:**
- Create: `texas-web/src/exporter.js`, `texas-web/src/exporter.test.js`

**Interfaces:**
- Consumes: storage.loadAll
- Produces:
```js
export function exportAll();               // → JSON字符串 {app:'texas-web', version:1, exportedAt, data:{sessions,hands,opponents,settings}}
export function importAll(jsonString);     // → {ok:true} | {ok:false, error}；校验 app/version，失败不写现有数据
```

- [ ] **Step 1: 失败测试**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { exportAll, importAll } from './exporter.js';
import { saveHands } from './storage.js';
describe('exporter', () => {
  beforeEach(() => localStorage.clear());
  it('导出→导入往返一致', () => {
    saveHands([{ id: 'h1', note: 'x' }]);
    const json = exportAll();
    localStorage.clear();
    expect(importAll(json).ok).toBe(true);
    expect(JSON.parse(localStorage.getItem('texas.hands'))[0].id).toBe('h1');
  });
  it('损坏/版本不符拒绝', () => {
    expect(importAll('not json').ok).toBe(false);
    expect(importAll(JSON.stringify({ app: 'other', version: 9 })).ok).toBe(false);
  });
});
```

- [ ] **Step 2: 跑失败 → Step 3: 实现**

```js
import { loadAll, saveSessions, saveHands, saveOpponents, saveSettings } from './storage.js';
export function exportAll() {
  const data = loadAll();
  return JSON.stringify({ app: 'texas-web', version: 1, exportedAt: new Date().toISOString(), data }, null, 1);
}
export function importAll(jsonString) {
  let obj;
  try { obj = JSON.parse(jsonString); } catch { return { ok: false, error: '不是有效的JSON' }; }
  if (obj?.app !== 'texas-web' || obj?.version !== 1) return { ok: false, error: '版本不兼容或文件类型不符' };
  const d = obj.data ?? {};
  if (!Array.isArray(d.hands)) return { ok: false, error: '数据结构不符（缺 hands）' };
  saveSessions(d.sessions ?? []); saveHands(d.hands);
  saveOpponents(d.opponents ?? []); if (d.settings) saveSettings(d.settings);
  return { ok: true };
}
```

- [ ] **Step 4: 接线设置页**（Task 21 的 onExport 下载 Blob、onImport 调 importAll 并提示结果 + 刷新）
- [ ] **Step 5: 跑测试 + Commit** `git commit -m "feat(data): full JSON export/import with version validation"`，更新 CLAUDE.md。

---

### Task 24: 历史页 — 会话分组/复盘卡/智能筛选 + 弱点矩阵 + EV双曲线

**Files:**
- Create: `texas-web/src/ui/historyList.js`, `texas-web/src/ui/reviewCard.js`, `texas-web/src/ui/weaknessMatrix.js`, `texas-web/src/ui/evCurve.js`, `texas-web/src/history.test.js`

**Interfaces:**
- Consumes: storage.loadAll；handMatrix（复盘卡重绘牌面）
- Produces:
```js
// historyList.js
export function renderHistoryPage(container, { filter, onFilter, onOpenHand });
// 顶部统计（累计盈亏+EV双曲线）；会话分组折叠列表；筛选：全部/偏离手/亏损手/按场景
// reviewCard.js
export function renderReviewCard(container, record, opponents);
// 牌面重绘、当时完整建议、实际行动、盈亏、偏离标记chip、标签+笔记可编辑
// weaknessMatrix.js
export function weaknessGroups(hands);       // → [{position, oppType, textureLabel, count, hitRate}]
export function renderWeaknessMatrix(container, hands);  // 样本<20手只显示计数不出结论
// evCurve.js
export function cumulativeSeries(hands);     // → [{i, actual, theory}]
export function renderEvCurve(container, hands);  // SVG双曲线
```

- [ ] **Step 1: 失败测试（纯逻辑部分）**

```js
import { describe, it, expect } from 'vitest';
import { weaknessGroups } from './ui/weaknessMatrix.js';
import { cumulativeSeries } from './ui/evCurve.js';
import { isDeviated, isLoss } from './ui/historyList.js';
const H = o => ({ followedAdvice: true, result: { net: 0 }, heroPosition: 'BTN',
  opponents: [{ typeSnapshot: 'TAG' }], texture: '干燥', ...o });
describe('history logic', () => {
  it('筛选', () => {
    expect(isDeviated(H({ followedAdvice: false }))).toBe(true);
    expect(isLoss(H({ result: { net: -10 } }))).toBe(true);
  });
  it('弱点分组：位置×对手×纹理', () => {
    const g = weaknessGroups([H(), H({ followedAdvice: false }), H({ heroPosition: 'BB' })]);
    expect(g.length).toBe(2);
    const btn = g.find(x => x.position === 'BTN');
    expect(btn.count).toBe(2);
    expect(btn.hitRate).toBeCloseTo(0.5);
  });
  it('EV双曲线累计', () => {
    const s = cumulativeSeries([H({ result: { net: 10 } }), H({ result: { net: -4 } })]);
    expect(s.at(-1).actual).toBe(6);
    expect(s[0].theory).toBeTypeOf('number');
  });
});
```

- [ ] **Step 2: 跑失败 → Step 3: 实现（四个模块）**

```js
// historyList.js（逻辑+渲染）
import { loadAll } from '../storage.js';
import { cumulativeSeries, renderEvCurve } from './evCurve.js';
import { renderWeaknessMatrix } from './weaknessMatrix.js';
import { renderReviewCard } from './reviewCard.js';
export const isDeviated = h => h.followedAdvice === false;
export const isLoss = h => (h.result?.net ?? 0) < 0;
export function renderHistoryPage(container, { filter = 'all', onFilter, onOpenHand }) {
  const { hands, sessions } = loadAll();
  container.innerHTML = '';
  // 顶部统计
  const total = hands.reduce((a, h) => a + (h.result?.net ?? 0), 0);
  const stat = document.createElement('div');
  stat.className = 'card';
  stat.innerHTML = `<b>累计盈亏</b> <span class="num" style="font-size:24px;color:${total >= 0 ? 'var(--accent)' : 'var(--danger)'}">${total > 0 ? '+' : ''}${total.toFixed(1)}</span>`;
  container.appendChild(stat);
  renderEvCurve(container, hands);
  // 筛选条
  const bar = document.createElement('div');
  bar.className = 'card';
  bar.innerHTML = ['all:全部', 'dev:只看偏离手', 'loss:只看亏损手', 'preflop:翻前', 'flop:翻牌', 'turn:转牌', 'river:河牌']
    .map(([k, t]) => `<button data-f="${k}" class="chip">${t}</button>`).join(' ');
  container.appendChild(bar);
  bar.addEventListener('click', e => { const b = e.target.closest('button'); if (b) onFilter(b.dataset.f); });
  const filtered = hands.filter(h => filter === 'all' || (filter === 'dev' && isDeviated(h)) ||
    (filter === 'loss' && isLoss(h)) || h.street === filter);
  // 会话分组（折叠）
  for (const s of sessions) {
    const group = filtered.filter(h => h.sessionId === s.id);
    if (!group.length) continue;
    const det = document.createElement('details');
    det.className = 'card';
    det.innerHTML = `<summary><b>${s.name}</b> · ${s.date} · ${group.length}手</summary>`;
    for (const h of group) {
      const item = document.createElement('button');
      item.style.cssText = 'display:block;width:100%;text-align:left;background:var(--bg);border:none;border-top:1px solid var(--border);color:var(--text);padding:8px;';
      const net = h.result?.net ?? 0;
      item.innerHTML = `<span class="num">${h.hand.join(' ')}</span> ${h.street}
        <span style="color:${isDeviated(h) ? 'var(--warn)' : ''}">${isDeviated(h) ? '⚠偏离' : ''}</span>
        <span class="num" style="float:right;color:${net >= 0 ? 'var(--accent)' : 'var(--danger)'}">${net > 0 ? '+' : ''}${net}</span>`;
      item.addEventListener('click', () => onOpenHand(h));
      det.appendChild(item);
    }
    container.appendChild(det);
  }
  renderWeaknessMatrix(container, hands);
}

// reviewCard.js
import { renderMatrix } from './handMatrix.js';
import { saveHands } from '../storage.js';
import { loadAll } from '../storage.js';
export function renderReviewCard(container, record) {
  container.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `<div class="num" style="font-size:18px">${record.hand.join(' ')} + ${record.board.join(' ') || '（翻前）'}</div>
    <div class="dim">${record.street} · ${record.preflopScenario.heroPosition} · ${record.tableProfile}</div>
    <div>当时建议：<b>${record.advice}</b>（胜率 ${(record.equity * 100).toFixed(1)}%）· GTO对照：${record.gtoAction}</div>
    <div>实际行动：${record.action} · 盈亏 <span class="num">${record.result?.net ?? 0}</span>
      ${record.followedAdvice === false ? '<span style="color:var(--warn)">⚠偏离建议</span>' : ''}</div>
    <label>标签 <input id="rv-tags" value="${(record.tags ?? []).join(',')}"/></label>
    <label>笔记 <input id="rv-notes" value="${record.notes ?? ''}"/></label>
    <div><label>实际行动 <input id="rv-action" value="${record.action ?? ''}"/></label>
    <label>盈亏 <input id="rv-net" type="number" value="${record.result?.net ?? 0}"/></label>
    <label><input type="checkbox" id="rv-follow" ${record.followedAdvice !== false ? 'checked' : ''}/> 跟随了建议</label></div>`;
  const save = document.createElement('button');
  save.textContent = '保存修改';
  save.addEventListener('click', () => {
    const { hands } = loadAll();
    const idx = hands.findIndex(h => h.id === record.id);
    if (idx >= 0) {
      hands[idx] = { ...hands[idx],
        action: el.querySelector('#rv-action').value,
        result: { net: +el.querySelector('#rv-net').value },
        followedAdvice: el.querySelector('#rv-follow').checked,
        tags: el.querySelector('#rv-tags').value.split(',').map(s => s.trim()).filter(Boolean),
        notes: el.querySelector('#rv-notes').value };
      saveHands(hands);
    }
  });
  el.appendChild(save);
  container.appendChild(el);
  // 迷你范围热力图（当时对手范围无法复原则显示牌面重绘矩阵占位）
  const holder = document.createElement('div');
  container.appendChild(holder);
  renderMatrix(holder, { mini: true, grid: null, mask: null, highlight: record.hand ? undefined : '' });
}

// weaknessMatrix.js
export function weaknessGroups(hands) {
  const map = new Map();
  for (const h of hands) {
    if (h.followedAdvice == null) continue;
    const pos = h.preflopScenario?.heroPosition ?? '?';
    const oppType = h.opponents?.[0]?.typeSnapshot ?? '?';
    const tex = h.texture || '?';
    const key = `${pos}|${oppType}|${tex}`;
    const g = map.get(key) ?? { position: pos, oppType, textureLabel: tex, count: 0, hits: 0 };
    g.count++; if (h.followedAdvice !== false && (h.result?.net ?? 0) >= 0) g.hits++;
    map.set(key, g);
  }
  return [...map.values()].map(g => ({ ...g, hitRate: g.hits / g.count }));
}
export function renderWeaknessMatrix(container, hands) {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = '<b>个人弱点矩阵（位置 × 对手类型 × 纹理）</b>';
  const groups = weaknessGroups(hands).sort((a, b) => a.hitRate - b.hitRate);
  for (const g of groups) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;border-top:1px solid var(--border);padding:4px 0;';
    const enough = g.count >= 20;
    row.innerHTML = `<span>${g.position} × ${g.oppType} × ${g.textureLabel}</span>
      <span class="num">${enough ? Math.round(g.hitRate * 100) + '% 命中' : ''} <span class="dim">（${g.count}手${enough ? '' : '，样本<20不出结论'}）</span></span>`;
    el.appendChild(row);
  }
  container.appendChild(el);
}

// evCurve.js
export function cumulativeSeries(hands) {
  let actual = 0, theory = 0;
  return hands.map((h, i) => {
    actual += h.result?.net ?? 0;
    theory += (h.evCall ?? 0);       // 理论EV按跟注EV逐手累计（简化口径，页脚注明）
    return { i: i + 1, actual, theory };
  });
}
export function renderEvCurve(container, hands) {
  const el = document.createElement('div');
  el.className = 'card';
  const pts = cumulativeSeries(hands);
  const vals = pts.flatMap(p => [p.actual, p.theory]);
  const max = Math.max(1, ...vals.map(Math.abs));
  const W = 320, Hh = 90;
  const path = key => pts.map((p, i) => `${i ? 'L' : 'M'}${(i / Math.max(1, pts.length - 1)) * W},${Hh / 2 - (p[key] / max) * (Hh / 2 - 4)}`).join('');
  el.innerHTML = `<b>EV双曲线</b><div class="dim" style="font-size:11px">绿=实际盈亏累计 蓝虚线=理论EV累计（按跟注EV口径）</div>
    <svg viewBox="0 0 ${W} ${Hh}" style="width:100%">
      <path d="${path('actual')}" stroke="var(--accent)" fill="none" stroke-width="2"/>
      <path d="${path('theory')}" stroke="var(--blue)" fill="none" stroke-dasharray="4 3"/>
    </svg>`;
  container.appendChild(el);
}
```
main.js 接历史页：`onOpenHand = h => renderReviewCard(layer, h)`（弹层用 `<dialog>`）；`onFilter = f => renderHistoryPage(page, {filter:f, onFilter, onOpenHand})`。

- [ ] **Step 4: 跑测试** → 全绿；手动走查：记录2手（一跟建议一偏离）→ 历史页分组/筛选/复盘/弱点矩阵/曲线正确。
- [ ] **Step 5: Commit** `git commit -m "feat(ui): history page with sessions, review card, weakness matrix, EV curves"`，更新 CLAUDE.md。**阶段D完成**。

---

# 阶段E：电脑端 + PWA + 部署

### Task 25: 电脑四栏工作台（≥1024px）+ 键盘快捷键

**Files:**
- Modify: `texas-web/src/style.css`（追加桌面布局）, `texas-web/src/main.js`（双渲染容器）

**Interfaces:**
- Produces: ≥1024px 四栏（`1.1:1:1.2:0.9`）：①牌面+局面 ②结果 ③策略 ④历史/统计；1024-1279px 降级三栏（历史并到底部）；<1024px 手机布局不变；快捷键 `1-4` 花色、`Enter` 确认、`C` 清空、`Space` 重算

- [ ] **Step 1: CSS 追加**

```css
@media (min-width: 1024px) {
  body { max-width: 1920px; margin: 0 auto; }
  #workspace { display: grid; grid-template-columns: 1.1fr 1fr 1.2fr 0.9fr; gap: 8px; padding: 8px; }
  #workspace > section { overflow-y: auto; max-height: calc(100vh - 56px); }
  #desktop-topbar { display: flex; gap: 12px; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--border); }
}
@media (min-width: 1024px) and (max-width: 1279px) {
  #workspace { grid-template-columns: 1.1fr 1fr 1.2fr; }
  #ws-history { grid-column: 1 / -1; }          /* 历史横铺到底部 */
}
@media (max-width: 1023.9px) { #workspace { display: block; } }
```

- [ ] **Step 2: main.js 双模式**：`matchMedia('(min-width:1024px)')` 变化时重建 DOM——桌面把 计算页内容拆入 `#ws-input` `#ws-result` `#ws-strategy`，历史页内容常驻 `#ws-history`；移动端维持原四标签。顶栏显示 `翻牌 · 6人桌 · N对手 · 🎯画像 · 快捷键可用`。
- [ ] **Step 3: 快捷键**（main.js 全局监听）：

```js
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  const suitMap = { '1': 's', '2': 'h', '3': 'd', '4': 'c' };
  if (suitMap[e.key]) window.__setNextSuit?.(suitMap[e.key]);   // 选牌器暴露的辅助钩子
  if (e.key === 'Enter') window.__confirmCards?.();
  if (e.key.toLowerCase() === 'c') window.__clearCards?.();
  if (e.key === ' ') { e.preventDefault(); window.__recalc?.(); }
});
```

- [ ] **Step 4: 手动走查（F12：iPhone SE / iPad 768 / 1280 / 1920）**：四栏比例正确、<1280 降级、快捷键生效、横竖屏无破损。
- [ ] **Step 5: Commit** `git commit -m "feat(ui): desktop 4-column workspace + keyboard shortcuts"`，更新 CLAUDE.md。

---

### Task 26: PWA manifest + Service Worker（基础离线）

**Files:**
- Create: `texas-web/manifest.webmanifest`, `texas-web/sw.js`, `texas-web/public/icon-192.png`, `texas-web/public/icon-512.png`（纯色♠占位图标，可用脚本生成）
- Modify: `texas-web/index.html`（加 manifest 链接与 SW 注册）, `vite.config.js`

- [ ] **Step 1: manifest.webmanifest**

```json
{
  "name": "德扑助手 · 学习训练工具",
  "short_name": "德扑助手",
  "start_url": "./",
  "display": "fullscreen",
  "background_color": "#0d1117",
  "theme_color": "#0d1117",
  "icons": [{ "src": "./icon-192.png", "sizes": "192x192", "type": "image/png" },
            { "src": "./icon-512.png", "sizes": "512x512", "type": "image/png" }]
}
```

- [ ] **Step 2: sw.js（缓存优先，版本号手更）**

```js
const CACHE = 'texas-web-v1';
const ASSETS = ['./', './index.html', './manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    const copy = res.clone();
    if (e.request.method === 'GET' && res.ok) caches.open(CACHE).then(c => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match('./index.html'))));
});
```
（WASM 与构建产物经 vite build 输出后在首次访问时被动态缓存——满足"缓存后二次打开 <1s"。）

- [ ] **Step 3: index.html 追加**

```html
<link rel="manifest" href="./manifest.webmanifest" />
<meta name="theme-color" content="#0d1117" />
<script>
  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
</script>
```

- [ ] **Step 4: 构建验证**：`npm run build && npm run preview` → 浏览器 DevTools > Application：manifest 无错误；断网刷新仍可用（离线勾选）。
- [ ] **Step 5: Commit** `git commit -m "feat(pwa): manifest + service worker offline cache"`，更新 CLAUDE.md。

---

### Task 27: 部署上线（GitHub Pages ¥0）+ 真机验收 + 交接文档收尾

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: 全部前置任务
- Produces: 公网可访问 URL + 验收记录写入 CLAUDE.md

- [ ] **Step 1: 部署工作流** `.github/workflows/deploy.yml`

```yaml
name: deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: texas-web/package-lock.json }
      - run: npm ci
        working-directory: texas-web
      - run: npm run build
        working-directory: texas-web
      - uses: actions/upload-pages-artifact@v3
        with: { path: texas-web/dist }
      - uses: actions/deploy-pages@v4
```

- [ ] **Step 2: 发布**

```bash
cd /c/Users/36327/Desktop/Texas
git remote add origin https://github.com/<用户名>/texas.git   # 先在 GitHub 建空仓库（Public，免费）
git push -u origin main
# GitHub 仓库 Settings → Pages → Source 选 "GitHub Actions"
```
Expected: Actions 跑绿，`https://<用户名>.github.io/texas/` 可访问。（备选：Cloudflare Pages 连接仓库，构建命令 `cd texas-web && npm run build`，输出目录 `texas-web/dist`。）

- [ ] **Step 3: 验收对照（设计§13，逐项勾选记录到 CLAUDE.md）**
  - 功能：13条功能项逐项手测
  - 性能：手机真机 2000次×2对手 <300ms；GTO切换 <50ms；首屏 <3s(4G)
  - 兼容：iPhone Safari + Android Chrome 实测；320px~1920px；添加到主屏幕全屏
  - 合规：关于页定位声明 + 理性游戏提示在产品页可见

- [ ] **Step 4: CLAUDE.md 收尾更新**

```markdown
**最后更新：** 2026-09-__（v4.0 网页版开发完成并部署：<URL>）
**当前阶段：** 已上线；下一阶段为 PWA 增强/观察深化（§五 阶段C）
```
并勾选§五全部完成项、§四追加完成记录、记录实现中的偏离（calculator.cpp 未复制、Nash 表为简化共识等）。

- [ ] **Step 5: 最终提交**

```bash
git add -A && git commit -m "chore: deploy workflow + acceptance records" && git push
```

---

## 计划自审记录（writing-plans Self-Review）

1. **Spec 覆盖**：设计§3架构/§4UI（手机4标签→Task 15-21；电脑4栏→Task 25）/§5算法策略（Task 4-14）/§6数据结构（Task 22）/§7会话复盘（Task 22-24）/§8错误处理（分散于各任务：置灰→16、红框→16、引擎错误页→18、FIFO/导入校验→22-23、观察<20手默认值→10/14）/§9测试（引擎基准→Task 6、策略单测→8-14、UI清单→18/20/25、持久化→22-23、真机→27）/§10部署→27/§11 PWA→26/§13验收→27。设计§5.4D建议横幅优先级：短码Nash→charts.isShort 切换（Task 9/19）、翻前GTO对照（Task 19 gtoTitle）、翻后主建议（Task 18）——已覆盖。
2. **占位符扫描**：Task 17 stepper / Task 18 streetOf / Task 19 openOpponentDrawer 标注了"实现时以X为准/补全"，均为**单句可执行指令**（非TBD）；GTO 表为直接给定的完整数据。
3. **类型一致性**：`calculateEquityV2/evaluateDecision`（Task 6/7）与 loader（Task 3）、calc.js（Task 18）签名一致；`maskForOpponent` 返回 `{mask,widthPct}` 在 Task 10/18/22 一致；`getPreflopChart` 参数对象在 Task 9/19/20 一致；`renderMatrix({grid,mask,mini,highlight})` 在 Task 20/24 一致。
4. **已知风险**：① GTO 网格数据为手工整理共识简化版，Task 9 的宽度/关键格测试是防错位主防线，执行时若某表宽度越界优先修数据本身；② 基准3（AA vs 前10%≈82%）依赖 top22 类清单，容差±2%已给足；③ Emscripten 版本差异可能影响 embind 语法，Task 3 先用 ping 验证管线。
