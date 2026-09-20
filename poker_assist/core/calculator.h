#ifndef CALCULATOR_H
#define CALCULATOR_H

#include "card.h"
#include "evaluator.h"
#include <vector>
#include <random>

// 胜率结果结构
struct EquityResult {
    double winRate;      // 胜率
    int simulations;     // 使用的模拟次数
    double confidence;   // 置信区间

    EquityResult() : winRate(0.0), simulations(0), confidence(0.0) {}
    EquityResult(double wr, int sims, double conf)
        : winRate(wr), simulations(sims), confidence(conf) {}
};

// 计算结果结构
struct Result {
    EquityResult equity;
    double evCall;        // 跟注EV
    double evRaise;       // 加注EV
    double potOdds;       // 底池赔率
    double requiredEquity; // 需要的胜率
    std::string decision; // 决策建议
    std::string raiseRecommendation; // 加注建议

    Result() : evCall(0.0), evRaise(0.0), potOdds(0.0), requiredEquity(0.0) {}
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
    double calculateRaiseEV(double winRate, double pot, double callAmount, double raiseAmount);
    double calculatePotOdds(double pot, double callAmount);
    double calculateRequiredEquity(double potOdds);
    double calculateConfidence(double equity, int simulations);

    // 自适应采样
    EquityResult calculateAdaptive(const std::vector<Card>& myHand,
                                  const std::vector<Card>& board,
                                  double potOdds, int opponents);

    // 决策生成
    std::string generateDecision(double winRate, double requiredEquity, double evCall, double evRaise);
    std::string generateRaiseRecommendation(double winRate, double evRaise, double pot);

public:
    Calculator(int base = 500, int max = 5000);

    // 主计算函数
    Result calculate(const std::vector<Card>& myHand,
                   const std::vector<Card>& board,
                   double pot, double call,
                   int opponents = 1);

    // 设置参数
    void setBaseSimulations(int base);
    void setMaxSimulations(int max);
};

#endif // CALCULATOR_H