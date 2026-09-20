#ifndef RANGE_H
#define RANGE_H
#include <cstdint>

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

private:
    uint8_t weights_[NUM_CLASSES];
};
#endif
