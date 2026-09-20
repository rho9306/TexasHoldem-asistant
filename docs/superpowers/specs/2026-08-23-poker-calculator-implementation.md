# 德扑助手实现计划

**日期：** 2026-08-23
**版本：** 1.0
**状态：** 实现规划

---

## 项目概述

基于已完成的设计文档，本文档提供详细的实现步骤和开发指南。

### 开发目标

1. 在Windows上实现功能完整的控制台版本
2. 核心算法设计为平台无关，便于ESP32移植
3. 采用C++17标准，无外部依赖

---

## 开发环境设置

### 必需工具

- **编译器：** 支持C++17的编译器（GCC 7+, Clang 5+, MSVC 2017+）
- **构建工具：** CMake 3.10+ 或 Make
- **IDE：** 可选（VS Code, CLion, Visual Studio等）

### 项目初始化

```bash
# 创建项目目录
mkdir poker_assist
cd poker_assist

# 创建基础目录结构
mkdir -p core ui utils tests

# 创建CMakeLists.txt
touch CMakeLists.txt
```

### 编译测试

```bash
# 编译项目
cmake .
make

# 运行测试
./poker_assist --test
```

---

## 模块1：核心数据结构（1-2周）

### 1.1 Card类

**文件：** `core/card.h`, `core/card.cpp`

**功能需求：**
```cpp
class Card {
public:
    enum Suit { SPADES, HEARTS, DIAMONDS, CLUBS, UNKNOWN };
    enum Rank { TWO=2, THREE, FOUR, FIVE, SIX, SEVEN, EIGHT, 
               NINE, TEN, JACK, QUEEN, KING, ACE, UNKNOWN };

private:
    Suit suit;
    Rank rank;

public:
    // 构造函数
    Card(Suit s = UNKNOWN, Rank r = UNKNOWN);
    Card(const std::string& notation);  // "As", "Kh" etc.
    
    // 获取方法
    Suit getSuit() const;
    Rank getRank() const;
    int getValue() const;  // 用于比较的数值
    
    // 字符串转换
    std::string toString() const;        // "A♠"
    std::string toNotation() const;      // "As"
    static Card fromNotation(const std::string& s);
    
    // 比较操作
    bool operator==(const Card& other) const;
    bool operator<(const Card& other) const;
};
```

**实现要点：**
- 花色符号：♠♥♦♣ (使用Unicode)
- 点数映射：T=10, J=11, Q=12, K=13, A=14
- 字符串解析支持大小写："as", "As", "AS" 都有效

**测试用例：**
```cpp
// 测试创建
Card c1(Card::SPADES, Card::ACE);
assert(c1.toString() == "A♠");
assert(c1.toNotation() == "As");

// 测试解析
Card c2 = Card::fromNotation("Kh");
assert(c2.getSuit() == Card::HEARTS);
assert(c2.getRank() == Card::KING);

// 测试比较
Card c3(Card::HEARTS, Card::ACE);
Card c4(Card::SPADES, Card::KING);
assert(c3 > c4);  // A > K
```

### 1.2 Deck类

**文件：** `core/deck.h`, `core/deck.cpp`

**功能需求：**
```cpp
class Deck {
private:
    std::vector<Card> cards;
    std::mt19937 rng;  // 随机数生成器

public:
    // 构造函数
    Deck();
    
    // 牌堆操作
    void shuffle();                      // 洗牌
    Card drawCard();                     // 抽一张牌
    void reset();                        // 重置为完整52张牌
    void removeCards(const std::vector<Card>&);  // 移除已知牌
    
    // 查询方法
    int remainingCount() const;
    std::vector<Card> getRemainingCards() const;
    bool hasCard(const Card& card) const;
};
```

**实现要点：**
- 使用Fisher-Yates洗牌算法
- 使用C++11 `<random>` 库
- 高效的牌查找和移除

**测试用例：**
```cpp
// 测试初始化
Deck deck;
assert(deck.remainingCount() == 52);

// 测试洗牌
deck.shuffle();
Card c1 = deck.drawCard();
Card c2 = deck.drawCard();
assert(c1 != c2);

// 测试移除
deck.reset();
std::vector<Card> known = {Card::fromNotation("As"), Card::fromNotation("Kh")};
deck.removeCards(known);
assert(deck.remainingCount() == 50);
assert(!deck.hasCard(Card::fromNotation("As")));
```

---

## 模块2：手牌评估器（2-3周）

### 2.1 牌型识别

**文件：** `core/evaluator.h`, `core/evaluator.cpp`

**功能需求：**
```cpp
class HandEvaluator {
public:
    // 牌型等级
    enum HandRank {
        HIGH_CARD = 1,
        ONE_PAIR,
        TWO_PAIR,
        THREE_OF_A_KIND,
        STRAIGHT,
        FLUSH,
        FULL_HOUSE,
        FOUR_OF_A_KIND,
        STRAIGHT_FLUSH,
        ROYAL_FLUSH
    };

    // 评估函数
    static int evaluateHand(const std::vector<Card>& hand, 
                           const std::vector<Card>& board);
    
    // 比较函数
    static bool beats(const std::vector<Card>& myHand, 
                     const std::vector<Card>& opponentHand,
                     const std::vector<Card>& board);
    
    // 获取牌型描述
    static std::string getHandRank(int score);
    static HandRank getHandRankEnum(int score);
};
```

**实现要点：**
- 输入：2张手牌 + 3-5张公共牌 = 5-7张牌
- 输出：整数分数，越大越强
- 分数结构：`牌型等级 * 1,000,000 + 关键牌值`
- 支持分牌比较（如一对AA比一对KK大）

**评估算法：**
```
1. 组合手牌+公共牌（最多7张）
2. 检查每种牌型：
   - 同花？顺子？同花顺？
   - 四条？葫芦？三条？
   - 两对？一对？
3. 返回最高牌型的分数
```

**测试用例：**
```cpp
// 皇家同花顺
std::vector<Card> hand = {Card::fromNotation("As"), Card::fromNotation("Ks")};
std::vector<Card> board = {Card::fromNotation("Qs"), Card::fromNotation("Js"), Card::fromNotation("Ts")};
int score = HandEvaluator::evaluateHand(hand, board);
assert(HandEvaluator::getHandRankEnum(score) == HandEvaluator::ROYAL_FLUSH);

// 一对 vs 高牌
std::vector<Card> hand1 = {Card::fromNotation("As"), Card::fromNotation("Ad")};
std::vector<Card> hand2 = {Card::fromNotation("Ks"), Card::fromNotation("Qs")};
std::vector<Card> board = {Card::fromNotation("2h"), Card::fromNotation("5d"), Card::fromNotation("9c")};
assert(HandEvaluator::beats(hand1, hand2, board));
```

---

## 模块3：计算引擎（2-3周）

### 3.1 Calculator类

**文件：** `core/calculator.h`, `core/calculator.cpp`

**功能需求：**
```cpp
struct EquityResult {
    double winRate;      // 胜率
    int simulations;     // 使用的模拟次数
    double confidence;   // 置信区间
};

struct Result {
    EquityResult equity;
    double evCall;       // 跟注EV
    double evRaise;      // 加注EV（可选）
    double potOdds;      // 底池赔率
    double requiredEquity; // 需要的胜率
    std::string decision; // 决策建议
};

class Calculator {
private:
    int baseSimulations;
    int maxSimulations;
    std::mt19937 rng;

    // 内部计算方法
    double simulateEquity(const std::vector<Card>& myHand,
                         const std::vector<Card>& board,
                         int opponents, int iterations);
    
    double calculateEV(double winRate, double pot, double callAmount);
    double calculatePotOdds(double pot, double callAmount);
    double calculateRequiredEquity(double potOdds);
    
    // 自适应采样
    EquityResult calculateAdaptive(const std::vector<Card>& myHand,
                                  const std::vector<Card>& board,
                                  double potOdds, int opponents);

public:
    Calculator(int base = 500, int max = 5000);
    
    // 主计算函数
    Result calculate(const std::vector<Card>& myHand,
                   const std::vector<Card>& board,
                   double pot, double call,
                   int opponents = 1);
};
```

**实现要点：**
- 蒙特卡洛模拟核心逻辑
- 自适应采样判断
- EV计算公式
- 决策建议生成

**蒙特卡洛模拟：**
```cpp
double Calculator::simulateEquity(const std::vector<Card>& myHand,
                                  const std::vector<Card>& board,
                                  int opponents, int iterations) {
    int wins = 0;
    
    for (int i = 0; i < iterations; i++) {
        // 创建副本牌堆
        Deck deck;
        deck.removeCards(myHand);
        deck.removeCards(board);
        
        // 发对手手牌
        std::vector<std::vector<Card>> opponentHands;
        for (int opp = 0; opp < opponents; opp++) {
            std::vector<Card> oppHand;
            oppHand.push_back(deck.drawCard());
            oppHand.push_back(deck.drawCard());
            opponentHands.push_back(oppHand);
        }
        
        // 补全公共牌
        std::vector<Card> completeBoard = board;
        while (completeBoard.size() < 5) {
            completeBoard.push_back(deck.drawCard());
        }
        
        // 比较结果
        bool iWin = true;
        for (const auto& oppHand : opponentHands) {
            if (!HandEvaluator::beats(myHand, oppHand, completeBoard)) {
                iWin = false;
                break;
            }
        }
        if (iWin) wins++;
    }
    
    return static_cast<double>(wins) / iterations;
}
```

**自适应采样：**
```cpp
EquityResult Calculator::calculateAdaptive(const std::vector<Card>& myHand,
                                          const std::vector<Card>& board,
                                          double potOdds, int opponents) {
    int n = baseSimulations;
    double equity = simulateEquity(myHand, board, opponents, n);
    
    double required = 1.0 / (potOdds + 1.0);
    double distance = std::abs(equity - required);
    
    if (distance < 0.05) {
        n = 2000;
        equity = simulateEquity(myHand, board, opponents, n);
        
        if (distance < 0.02) {
            n = 5000;
            equity = simulateEquity(myHand, board, opponents, n);
        }
    }
    
    return {equity, n, calculateConfidence(equity, n)};
}
```

**测试用例：**
```cpp
// 测试胜率计算
Calculator calc;
std::vector<Card> myHand = {Card::fromNotation("As"), Card::fromNotation("Kh")};
std::vector<Card> board = {Card::fromNotation("2h"), Card::fromNotation("5d"), Card::fromNotation("9c")};
Result result = calc.calculate(myHand, board, 100, 20, 1);

assert(result.equity.winRate > 0.5);  // AK应该胜率>50%
assert(result.evCall > 0);  // 应该是正EV
```

---

## 模块4：Windows界面（1-2周）

### 4.1 控制台UI类

**文件：** `ui/console.h`, `ui/console.cpp`

**功能需求：**
```cpp
class ConsoleUI {
private:
    // 当前状态
    enum PageState { INPUT_HAND, INPUT_POT, RESULT };
    PageState currentPage;
    
    // 输入数据
    std::vector<Card> myCards;
    std::vector<Card> boardCards;
    double potSize;
    double callAmount;
    
    // UI辅助方法
    void clearScreen();
    void printHeader();
    void printInputPage();
    void printPotPage();
    void printResultPage(const Result& result);
    std::string printCard(const Card& card);
    std::string printCards(const std::vector<Card>& cards);

public:
    ConsoleUI();
    
    // 主循环
    void run();
    
    // 页面处理
    void handleInputPage();
    void handlePotPage();
    void handleResultPage(const Result& result);
    
    // 输入处理
    char getKeyInput();
    Card getCurrentCardInput();
};
```

**实现要点：**
- 跨平台清屏（Windows/Linux）
- ANSI颜色支持（可选）
- 键盘输入映射
- 状态管理

**按键映射：**
```cpp
enum KeyCode {
    KEY_UP = 'A',      // 模拟滚轮顺时针
    KEY_DOWN = 'B',    // 模拟滚轮逆时针
    KEY_ENTER = '\r',  // 确认
    KEY_SPADE = '1',   // 花色键
    KEY_HEART = '2',
    KEY_DIAMOND = '3',
    KEY_CLUB = '4',
    KEY_CLEAR = 'C',   // 清空
    KEY_QUIT = 'Q',    // 退出
    KEY_HELP = 'H'     // 帮助
};
```

**界面实现：**
```cpp
void ConsoleUI::printInputPage() {
    clearScreen();
    printHeader();
    
    std::cout << "[1/3] 输入手牌\n";
    std::cout << "───────────────────────────────\n";
    
    // 显示已输入的手牌
    std::cout << "手牌1: " << (myCards.size() > 0 ? printCard(myCards[0]) : "___") << "\n";
    std::cout << "手牌2: " << (myCards.size() > 1 ? printCard(myCards[1]) : ">_?<") << "\n";
    
    // 显示公共牌
    for (size_t i = 0; i < 5; i++) {
        std::string label = "公共" + std::to_string(i+1) + ": ";
        std::string card = (i < boardCards.size()) ? printCard(boardCards[i]) : "___";
        std::cout << label << card << "\n";
    }
    
    std::cout << "───────────────────────────────\n";
    std::cout << "[→/-选择点数] [1-4选花色] [Enter确认]\n";
    std::cout << "[C清空] [Q退出] [H帮助]\n";
}
```

### 4.2 InputHandler类

**文件：** `ui/input.h`, `ui/input.cpp`

**功能需求：**
```cpp
class InputHandler {
private:
    int currentRankIndex;  // 当前选中的点数索引
    std::array<char, 13> ranks = {'2','3','4','5','6','7','8','9','T','J','Q','K','A'};
    int currentRankIndex;

public:
    InputHandler();
    
    // 输入处理
    Card getCardInput();
    double getNumberInput(double min, double max, double initial);
    void handleLongPress();
    void handleDoubleClick();
    
    // 状态管理
    void reset();
    void setCurrentRank(int index);
    char getCurrentRank();
};
```

**实现要点：**
- 长按检测（>1秒）
- 双击检测（<300ms间隔）
- 滚轮模拟

---

## 模块5：集成和测试（1周）

### 5.1 主程序

**文件：** `main.cpp`

```cpp
#include "core/calculator.h"
#include "ui/console.h"

int main(int argc, char* argv[]) {
    // 测试模式
    if (argc > 1 && std::string(argv[1]) == "--test") {
        runTests();
        return 0;
    }
    
    // 正常模式
    ConsoleUI ui;
    ui.run();
    
    return 0;
}
```

### 5.2 构建系统

**文件：** `CMakeLists.txt`

```cmake
cmake_minimum_required(VERSION 3.10)
project(PokerAssist VERSION 2.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 源文件
set(SOURCES
    main.cpp
    core/card.cpp
    core/deck.cpp
    core/evaluator.cpp
    core/calculator.cpp
    ui/console.cpp
    ui/input.cpp
)

# 头文件
set(HEADERS
    core/card.h
    core/deck.h
    core/evaluator.h
    core/calculator.h
    ui/console.h
    ui/input.h
)

# 可执行文件
add_executable(poker_assist ${SOURCES})

# 编译选项
if(MSVC)
    target_compile_options(poker_assist PRIVATE /W4)
else()
    target_compile_options(poker_assist PRIVATE -Wall -Wextra -pedantic)
endif()
```

### 5.3 测试框架

**文件：** `tests/test_all.cpp`

```cpp
#include <cassert>
#include "../core/card.h"
#include "../core/deck.h"
#include "../core/evaluator.h"
#include "../core/calculator.h"

void runTests() {
    std::cout << "Running tests...\n";
    
    // Card类测试
    std::cout << "Testing Card class... ";
    testCardClass();
    std::cout << "PASS\n";
    
    // Deck类测试
    std::cout << "Testing Deck class... ";
    testDeckClass();
    std::cout << "PASS\n";
    
    // Evaluator测试
    std::cout << "Testing HandEvaluator... ";
    testEvaluator();
    std::cout << "PASS\n";
    
    // Calculator测试
    std::cout << "Testing Calculator... ";
    testCalculator();
    std::cout << "PASS\n";
    
    std::cout << "All tests passed!\n";
}
```

---

## 开发时间线

### 第1-2周：核心数据结构
- Card类设计和实现
- Deck类设计和实现
- 基础测试

### 第3-4周：手牌评估器
- 牌型识别算法
- 比较逻辑实现
- 单元测试

### 第5-6周：计算引擎
- 蒙特卡洛模拟
- EV计算
- 自适应采样
- 集成测试

### 第7-8周：Windows界面
- TUI框架实现
- 输入处理
- 显示逻辑
- 用户测试

### 第9周：集成和优化
- 完整流程测试
- 性能优化
- Bug修复
- 文档完善

---

## 验收标准

### 功能验收

每个模块完成后：
- [ ] 所有单元测试通过
- [ ] 代码符合规范
- [ ] 性能满足要求
- [ ] 无明显Bug

### 最终验收

- [ ] 完整的Windows程序可运行
- [ ] 胜率计算准确（误差<2%）
- [ ] EV计算正确
- [ ] 决策建议合理
- [ ] 界面操作流畅
- [ ] 响应时间<2秒

---

## 下一步行动

1. **立即开始：** 创建项目结构和Card类
2. **第一周目标：** 完成Card和Deck类
3. **持续集成：** 每完成一个模块就进行测试
4. **文档更新：** 随时更新实现计划

---

**准备开始开发了吗？我们可以从创建项目结构和Card类开始。**
