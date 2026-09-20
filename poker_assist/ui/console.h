#ifndef CONSOLE_H
#define CONSOLE_H

#include "core/card.h"
#include "core/calculator.h"
#include <vector>
#include <memory>

class InputHandler;

class ConsoleUI {
private:
    // 当前状态
    enum PageState {
        INPUT_HAND,        // 输入手牌
        INPUT_FLOP_CARDS,  // 输入翻牌(3张)
        INPUT_FLOP_POT,    // 输入翻牌后底池信息
        FLOP_RESULT,       // 显示翻牌后结果
        INPUT_TURN_CARDS,  // 输入转牌(1张)
        INPUT_TURN_POT,    // 输入转牌后底池信息
        TURN_RESULT,       // 显示转牌后结果
        INPUT_RIVER_CARDS, // 输入河牌(1张)
        INPUT_RIVER_POT,   // 输入河牌后底池信息
        RIVER_RESULT,      // 显示河牌后结果
        HELP               // 帮助页面
    };
    PageState currentPage;

    // 输入数据
    std::vector<Card> myCards;
    std::vector<Card> boardCards;
    double potSize;
    double callAmount;
    int opponentCount;

    // 分阶段计算结果存储
    Result flopResult;
    Result turnResult;
    Result riverResult;

    // UI辅助方法
    void clearScreen();
    void printHeader();
    void printInputPage();
    void printPotPage();
    void printResultPage(const Result& result, const std::string& stageName);
    void printHelpPage();

    // 卡牌显示辅助
    std::string printCard(const Card& card);
    std::string printCards(const std::vector<Card>& cards);

    // 页面处理
    void handleInputPage();
    void handleFlopCardsPage();
    void handleFlopPotPage();
    void handleFlopResultPage();
    void handleTurnCardsPage();
    void handleTurnPotPage();
    void handleTurnResultPage();
    void handleRiverCardsPage();
    void handleRiverPotPage();
    void handleRiverResultPage();
    void handleHelpPage();

public:
    ConsoleUI();

    // 主循环
    void run();

    // 输入处理
    char getKeyInput();
    Card getCurrentCardInput();

    // 数据管理
    void clearAllData();
    bool isInputComplete();
};

#endif // CONSOLE_H