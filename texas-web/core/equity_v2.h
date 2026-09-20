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

// 范围化蒙特卡洛：opponentMasks[k] = 169个0-100权重；范围透视按实际采样到的类统计（样本≥5才参与danger排名）
// seed=0 时按系统时钟播种；传入固定seed可获得完全可复现的结果（测试用）
EquityV2Result calculateEquityV2(const std::vector<std::string>& heroHand,
                                 const std::vector<std::string>& board,
                                 const std::vector<std::vector<uint8_t>>& opponentMasks,
                                 int iterations,
                                 unsigned seed = 0);
#endif
