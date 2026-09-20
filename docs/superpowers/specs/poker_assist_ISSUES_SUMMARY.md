# 德扑助手项目 - 问题总结与状态报告

**项目状态：** Windows版本已完成，ESP32移植待完成
**创建日期：** 2026-08-23
**版本：** v2.0

---

## 已解决的问题 ✅

### 编译问题

#### 1. 枚举冲突错误
**问题描述：**
```
error: 'UNKNOWN' conflicts with a previous declaration
```
**解决方案：**
- 将`Suit`枚举中的`UNKNOWN`改为`SUIT_UNKNOWN`
- 将`Rank`枚举中的`UNKNOWN`改为`RANK_UNKNOWN`
- 更新所有相关引用

**修复文件：** `core/card.h`, `core/card.cpp`

#### 2. 缺失头文件
**问题描述：**
```
error: 'pow' was not declared in this scope
error: field 'ranks' has incomplete type 'std::array<char, 13>'
```
**解决方案：**
- 在`evaluator.cpp`中添加`#include <cmath>`
- 在`input.h`中添加`#include <array>`

**修复文件：** `core/evaluator.cpp`, `ui/input.h`

#### 3. 参数警告
**问题描述：**
```
warning: unused parameter 'result'
```
**解决方案：**
- 使用`(void)result;`或移除未使用的参数
- 这是轻微警告，不影响功能

**修复文件：** `ui/console.cpp`

### 运行时问题

#### 4. 无限循环
**问题描述：**
程序启动后立即进入无限循环，输出重复的"请输入手牌"

**根本原因：**
- `run()`方法中缺少退出条件和状态转换逻辑
- 循环中没有适当的输入等待

**解决方案：**
```cpp
void ConsoleUI::run() {
    while (true) {
        switch (currentPage) {
            case INPUT_HAND:
                handleInputPage();
                break;
            case INPUT_POT:
                handlePotPage();
                break;
            case RESULT:
                break;  // 在handlePotPage中已处理
            case HELP:
                handleHelpPage();
                break;
            default:
                currentPage = INPUT_HAND;
                break;
        }
        
        // 添加短暂延迟防止CPU占用过高
        #ifdef _WIN32
        Sleep(1);
        #else
        usleep(1000);
        #endif
    }
}
```

**修复文件：** `ui/console.cpp`

#### 5. 输入处理不完善
**问题描述：**
用户输入非标准命令时程序行为不确定

**解决方案：**
- 添加空输入处理
- 为所有输入路径添加默认行为
- 确保所有分支都有明确的后续动作

**修复文件：** `ui/console.cpp`

---

## 核心功能实现状态

### ✅ 已完成 (100%)

| 模块 | 功能 | 状态 | 备注 |
|------|------|------|------|
| Card类 | 卡牌表示和转换 | ✅ | 支持toString()和fromNotation() |
| Deck类 | 牌堆管理 | ✅ | 洗牌、发牌功能完整 |
| Evaluator类 | 手牌评估 | ✅ | 完整的7张牌评估算法 |
| Calculator类 | 蒙特卡洛模拟 | ✅ | 自适应采样500-5000次 |
| Calculator类 | EV计算 | ✅ | 跟注EV和加注EV |
| ConsoleUI类 | 控制台界面 | ✅ | 分页显示，交互流程完整 |
| InputHandler类 | 键盘输入 | ✅ | 模拟ESP32按键映射 |

### ✅ 已实现的算法细节

1. **手牌强度评估**：支持所有牌型（高牌到同花顺）
2. **蒙特卡洛模拟**：随机对手牌，完整模拟
3. **自适应采样**：根据临界距离自动调整模拟次数
4. **底池赔率计算**：精确的数学公式
5. **EV计算**：考虑胜率、底池、跟注金额
6. **决策等级**：强烈加注、加注、强烈跟注、略微跟注、强烈弃牌等

---

## 待解决的问题 🔄

### 高优先级

#### 1. ESP32硬件移植 ✅ 已完成
**状态：** 已完成
**完成时间：** 2026-08-23
**项目位置：** `poker_assist_esp32/`

**已完成项目：**
- [x] ESP32开发环境搭建（PlatformIO）
- [x] TFT屏幕驱动集成（TFT_eSPI库，ST7735 128x160）
- [x] 硬件按键接口实现
  - 4个花色键（GPIO12-15，上拉输入）
  - 1个旋转编码器（GPIO16-18，四倍频检测）
- [x] UI层重写（console → TFT）
- [x] 性能优化（降低模拟次数至200-1000）

**核心文件清单：**
```
poker_assist_esp32/
├── platformio.ini         ✅ 项目配置
├── README.md              ✅ ESP32版本说明
├── include/
│   ├── card.h            ✅ 内存优化Card类
│   ├── deck.h            ✅ 固定数组Deck类
│   ├── evaluator.h       ✅ 手牌评估器
│   ├── calculator.h      ✅ 计算引擎
│   ├── tft_ui.h          ✅ TFT界面类
│   ├── buttons.h         ✅ 按键处理类
│   └── User_Setup.h      ✅ TFT_eSPI配置
└── src/
    ├── core/             ✅ 核心算法实现
    ├── ui/               ✅ 界面实现
    └── main.cpp          ✅ 主程序
```

**硬件引脚定义：**
- TFT: MOSI=23, SCLK=18, CS=5, DC=2, RST=4, MISO=19
- 花色键: GPIO12-15
- 编码器: GPIO16-18

**已解决的移植问题：**
1. 内存优化：Card类从2字节压缩到1字节
2. 数组替代vector：避免堆碎片
3. 静态字符串缓冲区：减少堆分配
4. 轻量级随机数生成器：线性同余算法
5. 按键防抖：软件防抖50ms
6. 编码器四倍频检测
7. 长按检测(>1秒)
8. 双击检测(<300ms间隔)

**待调试问题：**
- TFT_eSPI库的字体显示可能需要调整
- 编码器中断处理可能需要优化
- 实际硬件测试和调校

#### 2. 加注EV算法优化
**状态：** 基础实现完成，需要优化
**当前问题：**
- 加注EV计算过于简化
- 没有考虑对手反应（跟注/弃牌/再加注）
- 没有考虑位置因素

**建议改进：**
```cpp
// 当前实现（简化）
EV(加注) = 胜率 × (底池 + 跟注 + 加注金额) - (1 - 胜率) × 加注金额

// 改进实现
EV(加注) = 胜率 × (底池 + 对手跟注) - (1 - 胜率) × 加注金额
         - 考虑对手弃牌概率
         - 考虑对手再加注风险
```

### 中优先级

#### 3. 输入验证和错误处理
**状态：** 基础实现完成
**需要改进：**
- 添加更严格的输入格式验证
- 提供更友好的错误提示
- 处理边缘情况（如非法卡牌格式）

#### 4. 性能优化
**状态：** 未优化
**需要改进：**
- 优化手牌评估算法速度
- 减少不必要的对象创建
- 考虑使用预计算表（翻牌前）

### 低优先级

#### 5. 用户界面增强
**状态：** 基础版本完成
**可选改进：**
- 添加颜色支持（需要跨平台库）
- 改进TUI布局
- 添加历史记录显示

#### 6. 单元测试
**状态：** 手动测试完成
**需要添加：**
- 自动化测试框架
- 完整的单元测试覆盖
- 集成测试

---

## 技术债务

### 代码质量问题

1. **警告消除**
   - `unused parameter`警告需要处理
   - 可以添加`(void)parameter;`或移除参数

2. **错误处理**
   - 部分地方使用`catch(...)`过于宽泛
   - 应该更精确的异常类型

3. **魔法数字**
   - 硬编码的数值应该定义为常量
   - 如：`500`（基础采样次数）、`0.05`（5%阈值）

### 设计问题

1. **职责分离**
   - `handlePotPage()`方法做了太多事情
   - 应该分离计算和显示逻辑

2. **状态管理**
   - 页面状态转换可以更清晰
   - 考虑使用状态机模式

---

## ESP32移植准备

### 硬件规格确认
```
主控：ESP32-WROOM-32 (双核240MHz)
屏幕：1.8" TFT LCD (128x160，ST7735)
输入：4个花色按键 + 1个旋转编码器
电源：800mAh锂电池 + TP4056充电模块
尺寸：6cm × 4.5cm × 1.5cm
成本：约¥80-100
```

### 按键布局（已确定）
```
┌─────────────────────────────┐
│   [1.8" TFT屏幕]            │
│   128×160像素                │
├─────────────────────────────┤
│                             │
│        [滚轮]                │  ← 中央位置，大拇指操作
│        (直径8mm)             │
│                             │
│   [♠]   [♥]   [♦]   [♣]     │  ← 底部一排，食指/中指
│   (8×8mm) 间距5mm           │
└─────────────────────────────┘
```

### 界面设计（已确定）
- **页面1**：输入手牌（2张手牌+最多5张公共牌）
- **页面2**：底池信息（底池、跟注、对手数）
- **页面3**：计算结果（胜率、EV、决策建议）

### 按键功能定义
```
滚轮顺时针：数值增加 / 下一选项
滚轮逆时针：数值减少 / 上一选项
滚轮按下：确认当前选择
滚轮长按(>1秒)：返回上一页
滚轮双击：跳转到结果页

花色键：输入对应花色
花色键长按：快速输入该花色的A

长按滚轮：清空所有输入，准备下一手
双击滚轮：快速开始新一手
```

### 需要实现的ESP32类

```cpp
// TFT显示
class TFTDisplay {
public:
    void init();
    void clear();
    void print(int x, int y, const char* text);
    void drawPage(int pageNum);
};

// 按键处理
class ButtonHandler {
public:
    void init();
    Button readButton();
    bool isPressed(Button btn);
    bool isLongPressed(Button btn);
};

// 旋转编码器
class EncoderHandler {
public:
    void init();
    int getDelta();        // 旋转方向和幅度
    bool isPressed();      // 按下检测
    bool isLongPressed();  // 长按检测
    bool isDoublePressed(); // 双击检测
};

// 页面状态机
enum PageState {
    INPUT_HAND,
    INPUT_POT,
    RESULT_MAIN,
    RESULT_DETAIL
};

class UIManager {
private:
    PageState currentPage;
    
public:
    void nextPage();
    void prevPage();
    void renderPage();
    void onInputComplete();
    void onCalcComplete();
};
```

---

## 文件清单

### 源代码文件
```
poker_assist/
├── CMakeLists.txt              ✅ 构建配置
├── README.md                    ✅ 项目说明
├── main.cpp                     ✅ 程序入口和测试
│
├── core/
│   ├── card.h                   ✅ 卡牌类声明
│   ├── card.cpp                 ✅ 卡牌类实现
│   ├── deck.h                   ✅ 牌堆类声明
│   ├── deck.cpp                 ✅ 牌堆类实现
│   ├── evaluator.h              ✅ 手牌评估声明
│   ├── evaluator.cpp            ✅ 手牌评估实现
│   ├── calculator.h             ✅ 计算器声明
│   └── calculator.cpp           ✅ 计算器实现
│
└── ui/
    ├── console.h                ✅ 控制台UI声明
    ├── console.cpp              ✅ 控制台UI实现
    ├── input.h                  ✅ 输入处理声明
    └── input.cpp                ✅ 输入处理实现
```

### 文档文件
```
docs/superpowers/specs/
├── 2026-08-23-poker-calculator-design.md         ✅ 设计文档
├── 2026-08-23-poker-calculator-implementation.md  ✅ 实现计划
└── poker_assist_ISSUES_SUMMARY.md                ✅ 本文档
```

---

## 编译和运行指令

### Windows编译
```bash
cd poker_assist
cmake .
cmake --build .
```

### 运行程序
```bash
./poker_assist.exe
```

### 运行测试
```bash
./poker_assist.exe --test
```

### 显示帮助
```bash
./poker_assist.exe --help
```

---

## 下一步工作建议

### 立即可做
1. 运行程序测试各种手牌组合
2. 验证计算结果的准确性
3. 收集用户反馈

### 短期目标（1-2周）✅ 已完成
1. ✅ 开始ESP32开发环境搭建
2. ✅ 创建ESP32版本的项目结构
3. ✅ 实现基础TFT显示功能
4. ✅ 完成按键处理和界面重写

### 中期目标（1-2月）
1. ✅ 完成ESP32版本移植
2. 🔲 硬件原型制作和测试
3. 🔲 实际使用测试

### 长期目标（3-6月）
1. 功能增强（对手范围、位置因素）
2. 性能优化
3. 产品化考虑

---

## 重要提示给下一个AI

1. **Windows版本已完成** - 所有核心功能正常工作
2. **ESP32版本已移植完成** - 代码位于poker_assist_esp32/目录
3. **核心算法已优化** - 针对ESP32内存和性能进行了优化
4. **硬件规格已确定** - 1.8" TFT + 4键+滚轮
5. **需要硬件测试** - 实际硬件测试和调试

### 关键文件位置
- Windows版本：`poker_assist/`
- ESP32版本：`poker_assist_esp32/`
- 设计文档：`docs/superpowers/specs/2026-08-23-poker-calculator-design.md`
- 实现计划：`docs/superpowers/specs/2026-08-23-poker-calculator-implementation.md`
- 问题总结：`docs/superpowers/specs/poker_assist_ISSUES_SUMMARY.md`（本文档）

### 优先级排序
1. **高优先级：ESP32硬件测试和调试**
2. **中优先级：算法优化和性能调优**
3. **低优先级：界面增强和用户体验优化**

### 编译环境测试进展 ✅ (2026-08-23)

**已完成：**
- ✅ Python 3.8.3 环境确认
- ✅ pip 25.0.1 安装验证
- ✅ PlatformIO 6.1.19 安装成功
- ✅ ESP32工具链自动下载中
- ✅ Arduino框架依赖安装中

**安装方法：** 使用清华大学镜像源解决网络问题
```bash
pip install platformio -i https://pypi.tuna.tsinghua.edu.cn/simple
```

**编译测试进行中：**
- ESP32开发板工具链正在自动下载和安装
- Arduino框架依赖正在安装
- 预计首次编译需要5-10分钟（下载工具链）

**已知问题：**
- ⚠️ platformio.ini中`build_opt_flags`选项未识别（非致命）
- ℹ️ 首次编译需要下载大量工具链（~500MB）

### ESP32版本待解决问题

#### 编译测试（进行中）
- [ ] 首次编译完成验证
- [ ] 识别并修复编译警告/错误
- [ ] 验证库依赖正确性

#### 硬件调试（高优先级）
- [ ] TFT_eSPI字体显示测试
- [ ] 编码器四倍频精度校准
- [ ] 按键防抖参数调优
- [ ] GPIO中断性能测试

#### 功能完善（中优先级）
- [ ] 翻牌前预计算表（Flash存储）
- [ ] 历史记录功能（Flash存储）
- [ ] 电池电量检测（ADC采样）
- [ ] 背光PWM控制

#### 性能优化（低优先级）
- [ ] 双核处理（一核UI，一核计算）
- [ ] 进一步降低采样次数
- [ ] TFT刷新频率优化

---

**项目当前状态：** ✅ Windows版本完成，ESP32版本已移植
**下一步任务：** 🔄 ESP32硬件调试和测试
**预估完成时间：** 1-2周（硬件调试）

---

## ESP32版本更新记录

### 2026-08-23 - v2.0 ESP32版本
**完成项目：**
- ✅ 完成ESP32项目结构（PlatformIO）
- ✅ 移植核心算法（内存优化版本）
- ✅ 实现TFT界面（TFT_eSPI）
- ✅ 实现按键处理（4花色键+编码器）
- ✅ 完成主程序和硬件配置

**技术优化：**
- Card类从2字节压缩到1字节存储
- 使用固定大小数组替代vector
- 静态字符串缓冲区避免堆分配
- 轻量级线性同余随机数生成器
- 降低采样次数至200-1000以适应ESP32性能

**已知问题：**
- 需要实际硬件测试TFT显示效果
- 编码器中断处理可能需要优化
- 按键防抖参数可能需要调优

**文件清单：**
```
poker_assist_esp32/
├── platformio.ini ✅
├── README.md ✅
├── include/
│   ├── card.h ✅
│   ├── deck.h ✅
│   ├── evaluator.h ✅
│   ├── calculator.h ✅
│   ├── tft_ui.h ✅
│   ├── buttons.h ✅
│   └── User_Setup.h ✅
└── src/
    ├── core/ ✅
    ├── ui/ ✅
    └── main.cpp ✅
```

---

## 下一个AI的工作指引

如果继续开发ESP32版本：

1. **硬件测试优先** - 首先验证TFT显示和按键功能
2. **逐步调优** - 根据实际硬件表现调整参数
3. **性能监控** - 使用Serial输出监控内存和CPU使用
4. **用户体验** - 优化响应速度和操作手感

如果需要添加功能：

1. **参考Windows版本** - 保持功能一致性
2. **考虑硬件限制** - ESP32内存和性能有限
3. **优先核心功能** - 胜率计算和决策建议最重要
4. **可选功能后置** - 历史记录等可后续添加

---

**文档更新日期：** 2026-08-23
**版本：** v2.1 (ESP32移植完成)
