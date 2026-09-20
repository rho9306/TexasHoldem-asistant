#include "input.h"
#include <iostream>
#include <algorithm>

InputHandler::InputHandler()
    : currentRankIndex(11),  // 默认选中K（索引11，从2开始）
      lastKey(0),
      longPressTriggered(false),
      currentState(SELECTING_RANK) {

    // 初始化点数数组：2,3,4,5,6,7,8,9,T,J,Q,K,A
    ranks = {'2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'};
}

char InputHandler::getCardInput() {
    // 简化实现，返回当前选中的点数
    return getCurrentRank();
}

double InputHandler::getNumberInput(double min, double max, double initial) {
    std::string input;
    std::getline(std::cin, input);

    try {
        double value = std::stod(input);
        // 限制范围
        value = std::max(min, std::min(max, value));
        return value;
    } catch (...) {
        return initial;
    }
}

void InputHandler::handleLongPress() {
    // 检测长按（>1秒）
    if (isLongPress()) {
        // 长按逻辑：返回上一页
        std::cout << "[长按] 返回\n";
    }
}

void InputHandler::handleDoubleClick() {
    // 检测双击（<300ms间隔）
    if (isDoubleClick()) {
        // 双击逻辑：快速跳转
        std::cout << "[双击] 快速跳转\n";
    }
}

void InputHandler::rotateClockwise() {
    currentRankIndex = (currentRankIndex + 1) % 13;
    std::cout << "[滚轮→] 当前选择: " << getCurrentRank() << "\n";
}

void InputHandler::rotateCounterClockwise() {
    currentRankIndex = (currentRankIndex - 1 + 13) % 13;
    std::cout << "[滚轮←] 当前选择: " << getCurrentRank() << "\n";
}

void InputHandler::pressEnter() {
    std::cout << "[确认] 选择: " << getCurrentRank() << "\n";
    currentState = CONFIRMED;
}

void InputHandler::pressSpade() {
    std::cout << "[♠] 输入黑桃\n";
}

void InputHandler::pressHeart() {
    std::cout << "[♥] 输入红桃\n";
}

void InputHandler::pressDiamond() {
    std::cout << "[♦] 输入方块\n";
}

void InputHandler::pressClub() {
    std::cout << "[♣] 输入梅花\n";
}

void InputHandler::reset() {
    currentRankIndex = 11;
    currentState = SELECTING_RANK;
    lastKey = 0;
    longPressTriggered = false;
}

void InputHandler::setCurrentRank(int index) {
    if (index >= 0 && index < 13) {
        currentRankIndex = index;
    }
}

char InputHandler::getCurrentRank() {
    return ranks[currentRankIndex];
}

bool InputHandler::isQuitKey(char c) {
    return c == 'Q' || c == 'q' || c == 27;  // 27是ESC键
}

bool InputHandler::isHelpKey(char c) {
    return c == 'H' || c == 'h' || c == '?';
}

bool InputHandler::isClearKey(char c) {
    return c == 'C' || c == 'c';
}

bool InputHandler::isSuitKey(char c) {
    return c == '1' || c == '2' || c == '3' || c == '4';
}

bool InputHandler::isNavigationKey(char c) {
    return c == '\r' || c == '\n' || c == ' ' || c == '+' || c == '-' ||
           c == 'A' || c == 'B' || c == 127;  // 127是Delete键
}

bool InputHandler::isEnterKey(char c) {
    return c == '\r' || c == '\n';
}

void InputHandler::updateLastKeyPress(char key) {
    auto now = std::chrono::steady_clock::now();
    lastKeyPressTime = now;
    lastKey = key;
    longPressTriggered = false;
}

bool InputHandler::isLongPress() {
    if (lastKey == 0) return false;

    auto now = std::chrono::steady_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(
        now - lastKeyPressTime).count();

    return duration > 1000 && !longPressTriggered;
}

bool InputHandler::isDoubleClick() {
    if (lastKey == 0) return false;

    auto now = std::chrono::steady_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(
        now - lastKeyPressTime).count();

    return duration < 300 && duration > 50;
}