#ifndef INPUT_H
#define INPUT_H

#include <string>
#include <chrono>
#include <array>

class InputHandler {
private:
    int currentRankIndex;  // 当前选中的点数索引（0-12，对应2-A）
    std::array<char, 13> ranks;

    // 长按和双击检测
    std::chrono::steady_clock::time_point lastKeyPressTime;
    char lastKey;
    bool longPressTriggered;

    // 当前输入状态
    enum InputState { SELECTING_RANK, SELECTING_SUIT, CONFIRMED };
    InputState currentState;

public:
    InputHandler();

    // 输入处理
    char getCardInput();
    double getNumberInput(double min, double max, double initial);
    void handleLongPress();
    void handleDoubleClick();

    // 滚轮操作
    void rotateClockwise();
    void rotateCounterClockwise();
    void pressEnter();

    // 花色键操作
    void pressSpade();
    void pressHeart();
    void pressDiamond();
    void pressClub();

    // 状态管理
    void reset();
    void setCurrentRank(int index);
    char getCurrentRank();
    int getCurrentRankIndex() const { return currentRankIndex; }

    // 按键映射
    static bool isQuitKey(char c);
    static bool isHelpKey(char c);
    static bool isClearKey(char c);
    static bool isSuitKey(char c);
    static bool isNavigationKey(char c);
    static bool isEnterKey(char c);

private:
    void updateLastKeyPress(char key);
    bool isLongPress();
    bool isDoubleClick();
};

#endif // INPUT_H