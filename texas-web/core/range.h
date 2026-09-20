#ifndef RANGE_H
#define RANGE_H
#include <cstdint>
#include <random>
#include "card.h"

// 169格手牌范围：对角线=口袋对(6组合)，上三角=同花(4)，下三角=异花(12)，共1326组合
class HandRange {
public:
    static constexpr int NUM_CLASSES = 169;
    static int classIndex(int hi, int lo, bool suited);
    static const char* className(int idx);
    static int combosOfClass(int idx);
    static void classRanks(int idx, int& hi, int& lo, bool& suited);

    HandRange();
    void setWeight(int idx, uint8_t w);
    uint8_t weight(int idx) const;

    // 在 used[52] 位图之外，按权重采样一手牌；成功返回true并写出两张牌
    bool sample(std::mt19937& rng, const bool used[52], Card out[2]) const;
    // 范围内未被占用的组合总数
    int liveCombos(const bool used[52]) const;
    static int cardIdx(const Card& c);   // (rank-2)*4+suit

private:
    uint8_t weights_[NUM_CLASSES];
};
#endif
