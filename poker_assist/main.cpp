#include <iostream>
#include <vector>
#include <string>

#ifdef _WIN32
#include <windows.h>
#endif

// 包含所有核心模块
#include "core/card.h"
#include "core/deck.h"
#include "core/evaluator.h"
#include "core/calculator.h"
#include "ui/console.h"

// 测试函数声明
void runTests();
void testCardClass();
void testDeckClass();
void testEvaluator();
void testCalculator();

int main(int argc, char* argv[]) {
#ifdef _WIN32
    // 设置控制台为UTF-8编码，支持中文显示
    SetConsoleOutputCP(CP_UTF8);
    SetConsoleCP(CP_UTF8);
#endif

    // 检查命令行参数
    if (argc > 1) {
        std::string arg = argv[1];
        if (arg == "--test" || arg == "-t") {
            std::cout << "运行测试模式...\n";
            runTests();
            return 0;
        } else if (arg == "--help" || arg == "-h") {
            std::cout << "德扑助手 v2.0\n";
            std::cout << "用法: poker_assist [选项]\n";
            std::cout << "选项:\n";
            std::cout << "  --test, -t    运行测试\n";
            std::cout << "  --help, -h    显示帮助\n";
            return 0;
        }
    }

    // 正常模式：启动UI
    try {
        ConsoleUI ui;
        ui.run();
    } catch (const std::exception& e) {
        std::cerr << "程序异常: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}

// ==================== 测试函数 ====================

void runTests() {
    std::cout << "开始测试...\n\n";

    try {
        testCardClass();
        testDeckClass();
        testEvaluator();
        testCalculator();

        std::cout << "\n";
        std::cout << "=====================================\n";
        std::cout << "所有测试通过！✓\n";
        std::cout << "=====================================\n";

    } catch (const std::string& error) {
        std::cout << "\n";
        std::cout << "=====================================\n";
        std::cout << "测试失败: " << error << "\n";
        std::cout << "=====================================\n";
    } catch (const std::exception& e) {
        std::cout << "\n";
        std::cout << "=====================================\n";
        std::cout << "测试异常: " << e.what() << "\n";
        std::cout << "=====================================\n";
    }
}

void testCardClass() {
    std::cout << "测试 Card 类... ";

    // 测试创建
    Card c1(Card::SPADES, Card::ACE);
    if (c1.toString() != "A♠") {
        throw std::string("Card::toString() 测试失败");
    }

    if (c1.toNotation() != "As") {
        throw std::string("Card::toNotation() 测试失败");
    }

    // 测试解析
    Card c2 = Card::fromNotation("Kh");
    if (c2.getSuit() != Card::HEARTS || c2.getRank() != Card::KING) {
        throw std::string("Card::fromNotation() 解析失败");
    }

    // 测试比较
    Card c3(Card::HEARTS, Card::ACE);
    Card c4(Card::SPADES, Card::KING);
    if (!(c3 > c4)) {
        throw std::string("Card 比较操作测试失败");
    }

    // 测试相等
    Card c5(Card::SPADES, Card::ACE);
    if (!(c1 == c5)) {
        throw std::string("Card 相等操作测试失败");
    }

    std::cout << "✓ 通过\n";
}

void testDeckClass() {
    std::cout << "测试 Deck 类... ";

    // 测试初始化
    Deck deck;
    if (deck.remainingCount() != 52) {
        throw std::string("Deck 初始化测试失败");
    }

    // 测试洗牌和抽牌
    deck.shuffle();
    Card c1 = deck.drawCard();
    Card c2 = deck.drawCard();

    if (c1 == c2) {
        throw std::string("Deck 抽牌测试失败");
    }

    if (deck.remainingCount() != 50) {
        throw std::string("Deck 计数测试失败");
    }

    // 测试移除
    deck.reset();
    std::vector<Card> known = {Card::fromNotation("As"), Card::fromNotation("Kh")};
    deck.removeCards(known);

    if (deck.remainingCount() != 50) {
        throw std::string("Deck removeCards 测试失败");
    }

    if (deck.hasCard(Card::fromNotation("As"))) {
        throw std::string("Deck hasCard 测试失败");
    }

    std::cout << "✓ 通过\n";
}

void testEvaluator() {
    std::cout << "测试 HandEvaluator 类... ";

    // 测试高牌
    std::vector<Card> highCardHand = {Card::fromNotation("As"), Card::fromNotation("Kh")};
    std::vector<Card> board = {Card::fromNotation("2h"), Card::fromNotation("5d"), Card::fromNotation("9c")};

    HandEvaluator::EvalResult result1 = HandEvaluator::evaluateHandDetailed(highCardHand, board);
    if (result1.rank != HandEvaluator::HIGH_CARD) {
        throw std::string("HandEvaluator 高牌识别失败");
    }

    // 测试一对
    std::vector<Card> pairHand = {Card::fromNotation("As"), Card::fromNotation("Ad")};
    HandEvaluator::EvalResult result2 = HandEvaluator::evaluateHandDetailed(pairHand, board);
    if (result2.rank != HandEvaluator::ONE_PAIR) {
        throw std::string("HandEvaluator 一对识别失败");
    }

    // 测试比较
    std::vector<Card> hand1 = {Card::fromNotation("As"), Card::fromNotation("Ad")};
    std::vector<Card> hand2 = {Card::fromNotation("Ks"), Card::fromNotation("Qs")};
    if (!HandEvaluator::beats(hand1, hand2, board)) {
        throw std::string("HandEvaluator beats 测试失败");
    }

    std::cout << "✓ 通过\n";
}

void testCalculator() {
    std::cout << "测试 Calculator 类... ";

    Calculator calc;

    // 测试胜率计算
    std::vector<Card> myHand = {Card::fromNotation("As"), Card::fromNotation("Kh")};
    std::vector<Card> board = {Card::fromNotation("2h"), Card::fromNotation("5d"), Card::fromNotation("9c")};

    Result result = calc.calculate(myHand, board, 100, 20, 1);

    // 验证结果合理性
    if (result.equity.winRate <= 0.0 || result.equity.winRate >= 1.0) {
        throw std::string("Calculator 胜率计算失败");
    }

    if (result.equity.simulations <= 0) {
        throw std::string("Calculator 模拟次数错误");
    }

    // 验证EV计算
    if (result.potOdds <= 0) {
        throw std::string("Calculator 底池赔率计算失败");
    }

    if (result.requiredEquity <= 0 || result.requiredEquity >= 1.0) {
        throw std::string("Calculator 需要胜率计算失败");
    }

    std::cout << "✓ 通过\n";
}