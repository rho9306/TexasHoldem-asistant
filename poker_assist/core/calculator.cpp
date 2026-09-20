#include "calculator.h"
#include "deck.h"
#include <cmath>
#include <chrono>
#include <algorithm>
#include <random>

Calculator::Calculator(int base, int max)
    : baseSimulations(base), maxSimulations(max),
      rng(std::chrono::steady_clock::now().time_since_epoch().count()) {}

Result Calculator::calculate(const std::vector<Card>& myHand,
                            const std::vector<Card>& board,
                            double pot, double call,
                            int opponents) {

    Result result;

    // 计算底池赔率
    result.potOdds = calculatePotOdds(pot, call);
    result.requiredEquity = calculateRequiredEquity(result.potOdds);

    // 蒙特卡洛模拟计算胜率
    result.equity = calculateAdaptive(myHand, board, result.potOdds, opponents);

    // 计算EV
    result.evCall = calculateEV(result.equity.winRate, pot, call);

    // 计算加注EV（假设加注到1.5倍底池）
    double raiseAmount = pot * 0.5 + call;  // 加注额
    result.evRaise = calculateRaiseEV(result.equity.winRate, pot, call, raiseAmount);

    // 生成决策建议
    result.decision = generateDecision(result.equity.winRate, result.requiredEquity,
                                     result.evCall, result.evRaise);
    result.raiseRecommendation = generateRaiseRecommendation(result.equity.winRate,
                                                             result.evRaise, pot);

    return result;
}

double Calculator::simulateEquity(const std::vector<Card>& myHand,
                                  const std::vector<Card>& board,
                                  int opponents, int iterations) {

    if (myHand.empty() || myHand.size() != 2) {
        return 0.0;  // 无效输入
    }

    int wins = 0;

    for (int i = 0; i < iterations; i++) {
        // 创建牌堆副本，使用不同的随机种子
        unsigned int seed = rng();
        Deck deck(seed);

        // 移除已知牌
        deck.removeCards(myHand);
        deck.removeCards(board);

        // 洗牌以确保随机性
        deck.shuffle();

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
        bool iTie = false;

        int myScore = HandEvaluator::evaluateHand(myHand, completeBoard);

        for (const auto& oppHand : opponentHands) {
            int oppScore = HandEvaluator::evaluateHand(oppHand, completeBoard);

            if (oppScore > myScore) {
                iWin = false;
                break;
            } else if (oppScore == myScore) {
                iTie = true;
            }
        }

        if (iWin) {
            wins++;
        } else if (iTie) {
            wins += 0.5;  // 平局算半胜
        }
    }

    return static_cast<double>(wins) / iterations;
}

double Calculator::calculateEV(double winRate, double pot, double callAmount) {
    // EV = 胜率 × (底池 + 对手下注) - (1-胜率) × 我的跟注
    // 简化：假设对手下注已经在底池中
    return winRate * pot - (1.0 - winRate) * callAmount;
}

double Calculator::calculateRaiseEV(double winRate, double pot, double callAmount, double raiseAmount) {
    // 简化的加注EV计算
    // 假设：
    // - 对手50%概率跟注，30%概率弃牌，20%概率再加注
    // - 如果对手弃牌，我赢得底池
    // - 如果对手跟注，按胜率计算

    double foldEV = 0.3 * pot;  // 对手弃牌，赢得底池
    double callEV = 0.5 * (winRate * (pot + raiseAmount + callAmount) -
                           (1.0 - winRate) * raiseAmount);
    double reraiseEV = 0.2 * 0.0;  // 简化：假设再加牌时弃牌，EV=0

    return foldEV + callEV + reraiseEV;
}

double Calculator::calculatePotOdds(double pot, double callAmount) {
    if (callAmount <= 0) return 0.0;
    return pot / callAmount;
}

double Calculator::calculateRequiredEquity(double potOdds) {
    return 1.0 / (potOdds + 1.0);
}

double Calculator::calculateConfidence(double equity, int simulations) {
    // 使用正态分布的95%置信区间
    // 标准误差 = sqrt(p(1-p)/n)
    if (simulations <= 0) return 0.0;

    double variance = equity * (1.0 - equity);
    double stdError = std::sqrt(variance / simulations);

    // 95%置信区间约为 ±1.96 * 标准误差
    return 1.96 * stdError;
}

EquityResult Calculator::calculateAdaptive(const std::vector<Card>& myHand,
                                           const std::vector<Card>& board,
                                           double potOdds, int opponents) {

    int n = baseSimulations;
    double equity = simulateEquity(myHand, board, opponents, n);

    double required = calculateRequiredEquity(potOdds);
    double distance = std::abs(equity - required);

    // 自适应判断
    if (distance < 0.05) {
        // 接近临界值，需要更高精度
        n = 2000;
        equity = simulateEquity(myHand, board, opponents, n);

        if (distance < 0.02) {
            // 非常接近，使用最大采样
            n = maxSimulations;
            equity = simulateEquity(myHand, board, opponents, n);
        }
    }

    double confidence = calculateConfidence(equity, n);
    return EquityResult(equity, n, confidence);
}

std::string Calculator::generateDecision(double winRate, double requiredEquity,
                                         double evCall, double evRaise) {

    double winRateDiff = winRate - requiredEquity;

    // 决策逻辑
    if (evRaise > evCall && evRaise > evCall * 1.3) {
        // 加注明显更好
        if (winRateDiff > 0.15) {
            return "强烈加注";
        } else if (winRateDiff > 0.10) {
            return "加注";
        }
    }

    if (winRateDiff > 0.10) {
        return "强烈跟注";
    } else if (winRateDiff > 0.02) {
        return "略微跟注";
    } else if (winRateDiff < -0.10) {
        return "强烈弃牌";
    } else if (winRateDiff < -0.02) {
        return "略微弃牌";
    } else {
        return "决策中性";
    }
}

std::string Calculator::generateRaiseRecommendation(double winRate, double evRaise, double pot) {
    if (evRaise <= 0) {
        return "不推荐加注";
    }

    if (winRate > 0.60) {
        // 价值加注
        double recommendedRaise = pot * 1.5;
        return "价值加注到 " + std::to_string(static_cast<int>(recommendedRaise));
    } else if (winRate > 0.40) {
        // 保护加注
        double recommendedRaise = pot * 0.75;
        return "保护加注到 " + std::to_string(static_cast<int>(recommendedRaise));
    } else if (winRate < 0.30) {
        // 诈唬风险高
        return "诈唬风险高，不推荐";
    } else {
        return "可考虑小幅加注";
    }
}

void Calculator::setBaseSimulations(int base) {
    baseSimulations = std::max(100, base);
}

void Calculator::setMaxSimulations(int max) {
    maxSimulations = std::max(baseSimulations, max);
}