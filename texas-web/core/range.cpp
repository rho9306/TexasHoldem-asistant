#include "range.h"
#include <cstdio>
#include <vector>
#include <utility>
#include <algorithm>

static const char* RANKS = "AKQJT98765432";

int HandRange::classIndex(int hi, int lo, bool suited) {
    if (hi == lo) return hi * 13 + hi;
    return suited ? hi * 13 + lo : lo * 13 + hi;
}

void HandRange::classRanks(int idx, int& hi, int& lo, bool& suited) {
    int r = idx / 13, c = idx % 13;
    if (r == c) { hi = lo = r; suited = false; }
    else if (c > r) { hi = r; lo = c; suited = true; }
    else { hi = c; lo = r; suited = false; }
}

const char* HandRange::className(int idx) {
    static char buf[4];
    int hi, lo; bool s;
    classRanks(idx, hi, lo, s);
    buf[0] = RANKS[hi]; buf[1] = RANKS[lo];
    if (hi == lo) { buf[2] = '\0'; return buf; }
    buf[2] = s ? 's' : 'o'; buf[3] = '\0';
    return buf;
}

int HandRange::combosOfClass(int idx) {
    int hi, lo; bool s; classRanks(idx, hi, lo, s);
    if (hi == lo) return 6;
    return s ? 4 : 12;
}

HandRange::HandRange() { for (int i = 0; i < NUM_CLASSES; ++i) weights_[i] = 100; }
void HandRange::setWeight(int idx, uint8_t w) { weights_[idx] = w; }
uint8_t HandRange::weight(int idx) const { return weights_[idx]; }

int HandRange::cardIdx(const Card& c) { return (c.getRank() - 2) * 4 + c.getSuit(); }

// 枚举某类中未被占用的具体组合（牌索引对）
static void freeCombos(int idx, const bool used[52], std::vector<std::pair<int,int>>& out) {
    int hi, lo; bool s;
    HandRange::classRanks(idx, hi, lo, s);
    if (hi == lo) {                       // 口袋对：C(4,2)=6组合
        for (int s1 = 0; s1 < 4; s1++)
            for (int s2 = s1 + 1; s2 < 4; s2++) {
                Card a((Card::Suit)s1, (Card::Rank)(14 - hi));
                Card b((Card::Suit)s2, (Card::Rank)(14 - hi));
                if (!used[HandRange::cardIdx(a)] && !used[HandRange::cardIdx(b)])
                    out.push_back({HandRange::cardIdx(a), HandRange::cardIdx(b)});
            }
    } else if (s) {                       // 同花：4组合
        for (int k = 0; k < 4; k++) {
            Card a((Card::Suit)k, (Card::Rank)(14 - hi));
            Card b((Card::Suit)k, (Card::Rank)(14 - lo));
            if (!used[HandRange::cardIdx(a)] && !used[HandRange::cardIdx(b)])
                out.push_back({HandRange::cardIdx(a), HandRange::cardIdx(b)});
        }
    } else {                              // 异花：4x3=12组合
        for (int s1 = 0; s1 < 4; s1++)
            for (int s2 = 0; s2 < 4; s2++) {
                if (s1 == s2) continue;
                Card a((Card::Suit)s1, (Card::Rank)(14 - hi));
                Card b((Card::Suit)s2, (Card::Rank)(14 - lo));
                if (!used[HandRange::cardIdx(a)] && !used[HandRange::cardIdx(b)])
                    out.push_back({HandRange::cardIdx(a), HandRange::cardIdx(b)});
            }
    }
}

int HandRange::liveCombos(const bool used[52]) const {
    int total = 0;
    std::vector<std::pair<int,int>> tmp;
    for (int i = 0; i < NUM_CLASSES; i++) {
        if (weights_[i] == 0) continue;
        tmp.clear();
        freeCombos(i, used, tmp);
        total += (int)tmp.size();
    }
    return total;
}

bool HandRange::sample(std::mt19937& rng, const bool used[52], Card out[2]) const {
    // 按 类权重x组合数 建累积表：组合级无偏（P(类) ∝ w*combos）
    long long cum[NUM_CLASSES]; long long acc = 0;
    for (int i = 0; i < NUM_CLASSES; i++) {
        acc += (long long)weights_[i] * combosOfClass(i);
        cum[i] = acc;
    }
    if (acc == 0) return false;
    std::uniform_int_distribution<long long> pickW(1, acc);

    for (int attempt = 0; attempt < 64; attempt++) {
        long long w = pickW(rng);
        int idx = (int)(std::lower_bound(cum, cum + NUM_CLASSES, w) - cum);
        std::vector<std::pair<int,int>> free;
        freeCombos(idx, used, free);
        if (free.empty()) continue;       // 组合全被占用→按权重重采样
        std::uniform_int_distribution<size_t> pick(0, free.size() - 1);
        const auto& p = free[pick(rng)];
        out[0] = Card((Card::Suit)(p.first % 4), (Card::Rank)(p.first / 4 + 2));
        out[1] = Card((Card::Suit)(p.second % 4), (Card::Rank)(p.second / 4 + 2));
        return true;
    }
    // 兜底：64次未命中（极小范围被严重占用）→ 在全部剩余组合中均匀挑一个
    std::vector<std::pair<int,int>> all;
    for (int i = 0; i < NUM_CLASSES; i++) {
        if (weights_[i] == 0) continue;
        freeCombos(i, used, all);
    }
    if (all.empty()) return false;
    std::uniform_int_distribution<size_t> pickAll(0, all.size() - 1);
    const auto& p = all[pickAll(rng)];
    out[0] = Card((Card::Suit)(p.first % 4), (Card::Rank)(p.first / 4 + 2));
    out[1] = Card((Card::Suit)(p.second % 4), (Card::Rank)(p.second / 4 + 2));
    return true;
}
