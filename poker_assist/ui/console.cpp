#include "console.h"
#include "input.h"
#include <iostream>
#include <iomanip>
#include <sstream>

#ifdef _WIN32
#include <windows.h>
#else
#include <unistd.h>
#endif

ConsoleUI::ConsoleUI()
    : currentPage(INPUT_HAND), potSize(0), callAmount(0), opponentCount(1) {
}

void ConsoleUI::run() {
    while (true) {
        switch (currentPage) {
            case INPUT_HAND:
                handleInputPage();
                break;
            case INPUT_FLOP_CARDS:
                handleFlopCardsPage();
                break;
            case INPUT_FLOP_POT:
                handleFlopPotPage();
                break;
            case FLOP_RESULT:
                handleFlopResultPage();
                break;
            case INPUT_TURN_CARDS:
                handleTurnCardsPage();
                break;
            case INPUT_TURN_POT:
                handleTurnPotPage();
                break;
            case TURN_RESULT:
                handleTurnResultPage();
                break;
            case INPUT_RIVER_CARDS:
                handleRiverCardsPage();
                break;
            case INPUT_RIVER_POT:
                handleRiverPotPage();
                break;
            case RIVER_RESULT:
                handleRiverResultPage();
                break;
            case HELP:
                handleHelpPage();
                break;
            default:
                currentPage = INPUT_HAND;
                break;
        }

        // 防止无限循环的短暂延迟
        #ifdef _WIN32
        Sleep(1);
        #else
        usleep(1000);
        #endif
    }
}

void ConsoleUI::clearScreen() {
#ifdef _WIN32
    system("cls");
#else
    system("clear");
#endif
}

void ConsoleUI::printHeader() {
    std::cout << "┌─ 德扑助手 v2.0 ───────────────────────┐\n";
}

void ConsoleUI::printInputPage() {
    clearScreen();
    printHeader();

    std::cout << "│ [1/3] 输入手牌                         │\n";
    std::cout << "│ ────────────────────────────────────────│\n";

    // 显示已输入的手牌
    std::cout << "│ 手牌1: " << (myCards.size() > 0 ? printCard(myCards[0]) : "___") << "\n";
    std::cout << "│ 手牌2: " << (myCards.size() > 1 ? printCard(myCards[1]) : ">_?<") << "\n";

    // 显示公共牌
    for (size_t i = 0; i < 5; i++) {
        std::string label = "│ 公共" + std::to_string(i+1) + ": ";
        std::string card = (i < boardCards.size()) ? printCard(boardCards[i]) : "___";

        // 如果是当前输入项，添加指示符
        if (i == boardCards.size() && i < 5) {
            card = ">" + card + "<";
        }

        std::cout << label << card << "\n";
    }

    std::cout << "│ ────────────────────────────────────────│\n";
    std::cout << "│ 输入格式: 点数+花色 (如: As Kh 2h 5d)  │\n";
    std::cout << "│ 花色: s=♠ h=♥ d=♦ c=♣  [C清空] [Q退出] │\n";
    std::cout << "└───────────────────────────────────────┘\n";
}

void ConsoleUI::printPotPage() {
    clearScreen();
    printHeader();

    std::cout << "│ [2/3] 底池信息                         │\n";
    std::cout << "│ ────────────────────────────────────────│\n";

    // 显示手牌预览
    std::cout << "│ 手牌: " << printCards(myCards);
    if (!boardCards.empty()) {
        std::cout << " 公共: " << printCards(boardCards);
    }
    std::cout << "\n";

    // 显示底池信息
    std::cout << "│ 底池: " << (potSize > 0 ? std::to_string(static_cast<int>(potSize)) : ">_<")
              << "    跟注: " << (callAmount > 0 ? std::to_string(static_cast<int>(callAmount)) : ">_<") << "\n";
    std::cout << "│ 对手数: " << opponentCount << " 人                          │\n";

    std::cout << "│ ────────────────────────────────────────│\n";
    std::cout << "│ [→/-调整数值] [Enter确认] [C返回]     │\n";
    std::cout << "│ [Q退出] [H帮助]                         │\n";
    std::cout << "└───────────────────────────────────────┘\n";
}

void ConsoleUI::printResultPage(const Result& result, const std::string& stageName) {
    clearScreen();
    printHeader();

    std::cout << "│ [" << stageName << "] 计算结果                   │\n";
    std::cout << "│ ────────────────────────────────────────│\n";

    // 显示手牌和公共牌
    std::cout << "│ 手牌: " << printCards(myCards) << "\n";
    if (!boardCards.empty()) {
        std::cout << "│ 公共: " << printCards(boardCards) << "\n";
    }

    std::cout << "│ ────────────────────────────────────────│\n";

    // 显示胜率信息
    std::cout << "│ 胜率: " << std::fixed << std::setprecision(1)
              << (result.equity.winRate * 100) << "% (需"
              << std::setprecision(1) << (result.requiredEquity * 100) << "%)    │\n";

    // 显示EV信息
    std::cout << "│ EV(跟注): " << std::setprecision(1) << result.evCall << "    │\n";
    std::cout << "│ EV(加注): " << std::setprecision(1) << result.evRaise << "    │\n";

    std::cout << "│                                           │\n";

    // 显示决策建议
    std::cout << "│ 建议: " << result.decision << "             │\n";
    if (!result.raiseRecommendation.empty() &&
        result.raiseRecommendation != "不推荐加注") {
        std::cout << "│ " << result.raiseRecommendation << "          │\n";
    }

    std::cout << "│ ────────────────────────────────────────│\n";
    std::cout << "│ [Enter继续] [C下一手] [Q退出]           │\n";
    std::cout << "└───────────────────────────────────────┘\n";
}

void ConsoleUI::printHelpPage() {
    clearScreen();
    printHeader();

    std::cout << "│ 按键说明                                 │\n";
    std::cout << "│ ────────────────────────────────────────│\n";
    std::cout << "│ 滚轮模拟：                                │\n";
    std::cout << "│  →/+ : 顺时针（增加）                    │\n";
    std::cout << "│  ←/- : 逆时针（减少）                    │\n";
    std::cout << "│  Enter : 按下确认                        │\n";
    std::cout << "│  Shift+Enter : 长按返回                  │\n";
    std::cout << "│                                           │\n";
    std::cout << "│ 花色键：                                  │\n";
    std::cout << "│  1 : ♠ 黑桃    2 : ♥ 红桃               │\n";
    std::cout << "│  3 : ♦ 方块    4 : ♣ 梅花               │\n";
    std::cout << "│                                           │\n";
    std::cout << "│ 快捷键：                                  │\n";
    std::cout << "│  C : 清空/下一手  Space : 快速跳转      │\n";
    std::cout << "│  H : 帮助        Q/Esc : 退出            │\n";
    std::cout << "│ ────────────────────────────────────────│\n";
    std::cout << "│ [任意键返回]                              │\n";
    std::cout << "└───────────────────────────────────────┘\n";
}

std::string ConsoleUI::printCard(const Card& card) {
    return card.toString();
}

std::string ConsoleUI::printCards(const std::vector<Card>& cards) {
    std::string result;
    for (const Card& card : cards) {
        result += printCard(card) + " ";
    }
    if (!result.empty()) {
        result.pop_back();  // 移除最后的空格
    }
    return result;
}

void ConsoleUI::handleInputPage() {
    printInputPage();

    if (myCards.size() >= 2) {
        currentPage = INPUT_FLOP_CARDS;
        return;
    }

    std::cout << "请输入手牌（如：As Kh）：";
    std::string input;
    std::getline(std::cin, input);

    if (input == "Q" || input == "q") {
        exit(0);
    } else if (input == "H" || input == "h") {
        currentPage = HELP;
        return;
    } else if (input == "C" || input == "c") {
        clearAllData();
        return;
    }

    std::istringstream iss(input);
    std::string cardStr;
    while (iss >> cardStr && myCards.size() < 2) {
        try {
            Card card = Card::fromNotation(cardStr);
            if (!card.isUnknown()) {
                myCards.push_back(card);
            }
        } catch (...) {
            // 忽略无效输入
        }
    }

    if (myCards.size() >= 2) {
        currentPage = INPUT_FLOP_CARDS;
    }
}

void ConsoleUI::handleFlopCardsPage() {
    printInputPage();

    std::cout << "请输入翻牌（3张公共牌，如：2h 5d 9c）：";
    std::string input;
    std::getline(std::cin, input);

    if (input == "Q" || input == "q") {
        exit(0);
    } else if (input == "H" || input == "h") {
        currentPage = HELP;
        return;
    } else if (input == "C" || input == "c") {
        clearAllData();
        return;
    }

    std::istringstream iss(input);
    std::string cardStr;
    while (iss >> cardStr && boardCards.size() < 3) {
        try {
            Card card = Card::fromNotation(cardStr);
            if (!card.isUnknown()) {
                boardCards.push_back(card);
            }
        } catch (...) {
            // 忽略无效输入
        }
    }

    if (boardCards.size() >= 3) {
        currentPage = INPUT_FLOP_POT;
    }
}

void ConsoleUI::handleFlopPotPage() {
    printPotPage();

    std::cout << "请输入底池大小：";
    std::string input;
    std::getline(std::cin, input);

    if (input == "Q" || input == "q") {
        exit(0);
    } else if (input == "C" || input == "c") {
        currentPage = INPUT_FLOP_CARDS;
        boardCards.clear();
        return;
    }

    try {
        potSize = std::stod(input);
    } catch (...) {
        potSize = 100;
    }

    std::cout << "请输入跟注金额：";
    std::getline(std::cin, input);

    if (input == "Q" || input == "q") {
        exit(0);
    }

    try {
        callAmount = std::stod(input);
    } catch (...) {
        callAmount = 20;
    }

    // 计算翻牌后结果
    Calculator calc;
    flopResult = calc.calculate(myCards, boardCards, potSize, callAmount, opponentCount);
    currentPage = FLOP_RESULT;
}

void ConsoleUI::handleFlopResultPage() {
    printResultPage(flopResult, "翻牌后");

    std::cout << "\n按 Enter 继续，C 下一手，Q 退出：";
    std::string input;
    std::getline(std::cin, input);

    if (input == "C" || input == "c" || input.empty()) {
        if (input.empty()) {
            // 继续到转牌
            currentPage = INPUT_TURN_CARDS;
        } else {
            // 下一手
            clearAllData();
            currentPage = INPUT_HAND;
        }
    } else if (input == "Q" || input == "q") {
        exit(0);
    } else {
        currentPage = INPUT_TURN_CARDS;
    }
}

void ConsoleUI::handleTurnCardsPage() {
    printInputPage();

    std::cout << "请输入转牌（第4张公共牌，如：Js）：";
    std::string input;
    std::getline(std::cin, input);

    if (input == "Q" || input == "q") {
        exit(0);
    } else if (input == "H" || input == "h") {
        currentPage = HELP;
        return;
    } else if (input == "C" || input == "c") {
        clearAllData();
        return;
    }

    try {
        Card card = Card::fromNotation(input);
        if (!card.isUnknown()) {
            boardCards.push_back(card);
        }
    } catch (...) {
        // 忽略无效输入
    }

    currentPage = INPUT_TURN_POT;
}

void ConsoleUI::handleTurnPotPage() {
    printPotPage();

    std::cout << "请输入底池大小：";
    std::string input;
    std::getline(std::cin, input);

    if (input == "Q" || input == "q") {
        exit(0);
    } else if (input == "C" || input == "c") {
        currentPage = INPUT_TURN_CARDS;
        boardCards.pop_back();  // 移除刚输入的转牌
        return;
    }

    try {
        potSize = std::stod(input);
    } catch (...) {
        potSize = 100;
    }

    std::cout << "请输入跟注金额：";
    std::getline(std::cin, input);

    if (input == "Q" || input == "q") {
        exit(0);
    }

    try {
        callAmount = std::stod(input);
    } catch (...) {
        callAmount = 20;
    }

    // 计算转牌后结果
    Calculator calc;
    turnResult = calc.calculate(myCards, boardCards, potSize, callAmount, opponentCount);
    currentPage = TURN_RESULT;
}

void ConsoleUI::handleTurnResultPage() {
    printResultPage(turnResult, "转牌后");

    std::cout << "\n按 Enter 继续，C 下一手，Q 退出：";
    std::string input;
    std::getline(std::cin, input);

    if (input == "C" || input == "c" || input.empty()) {
        if (input.empty()) {
            // 继续到河牌
            currentPage = INPUT_RIVER_CARDS;
        } else {
            // 下一手
            clearAllData();
            currentPage = INPUT_HAND;
        }
    } else if (input == "Q" || input == "q") {
        exit(0);
    } else {
        currentPage = INPUT_RIVER_CARDS;
    }
}

void ConsoleUI::handleRiverCardsPage() {
    printInputPage();

    std::cout << "请输入河牌（第5张公共牌，如：Tc）：";
    std::string input;
    std::getline(std::cin, input);

    if (input == "Q" || input == "q") {
        exit(0);
    } else if (input == "H" || input == "h") {
        currentPage = HELP;
        return;
    } else if (input == "C" || input == "c") {
        clearAllData();
        return;
    }

    try {
        Card card = Card::fromNotation(input);
        if (!card.isUnknown()) {
            boardCards.push_back(card);
        }
    } catch (...) {
        // 忽略无效输入
    }

    currentPage = INPUT_RIVER_POT;
}

void ConsoleUI::handleRiverPotPage() {
    printPotPage();

    std::cout << "请输入底池大小：";
    std::string input;
    std::getline(std::cin, input);

    if (input == "Q" || input == "q") {
        exit(0);
    } else if (input == "C" || input == "c") {
        currentPage = INPUT_RIVER_CARDS;
        boardCards.pop_back();  // 移除刚输入的河牌
        return;
    }

    try {
        potSize = std::stod(input);
    } catch (...) {
        potSize = 100;
    }

    std::cout << "请输入跟注金额：";
    std::getline(std::cin, input);

    if (input == "Q" || input == "q") {
        exit(0);
    }

    try {
        callAmount = std::stod(input);
    } catch (...) {
        callAmount = 20;
    }

    // 计算河牌后结果
    Calculator calc;
    riverResult = calc.calculate(myCards, boardCards, potSize, callAmount, opponentCount);
    currentPage = RIVER_RESULT;
}

void ConsoleUI::handleRiverResultPage() {
    printResultPage(riverResult, "河牌后");

    std::cout << "\n按 C 下一手，Q 退出：";
    std::string input;
    std::getline(std::cin, input);

    if (input == "C" || input == "c") {
        clearAllData();
        currentPage = INPUT_HAND;
    } else if (input == "Q" || input == "q") {
        exit(0);
    } else {
        clearAllData();
        currentPage = INPUT_HAND;
    }
}

void ConsoleUI::handleHelpPage() {
    printHelpPage();
    std::string dummy;
    std::getline(std::cin, dummy);
    currentPage = INPUT_HAND;
}

char ConsoleUI::getKeyInput() {
    // 简化实现，实际应该使用平台特定的键盘输入
    char c;
    std::cin >> c;
    return c;
}

Card ConsoleUI::getCurrentCardInput() {
    return Card();
}

void ConsoleUI::clearAllData() {
    myCards.clear();
    boardCards.clear();
    potSize = 0;
    callAmount = 0;
    opponentCount = 1;

    // 清除分阶段结果
    flopResult = Result();
    turnResult = Result();
    riverResult = Result();
}

bool ConsoleUI::isInputComplete() {
    return myCards.size() >= 2 && potSize > 0 && callAmount >= 0;
}