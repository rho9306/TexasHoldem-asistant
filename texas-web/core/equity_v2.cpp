#include "equity_v2.h"
#include "range.h"
#include "card.h"
#include "evaluator.h"
#include "deck.h"
#include <random>
#include <chrono>
#include <map>
#include <algorithm>
#include <utility>

EquityV2Result calculateEquityV2(const std::vector<std::string>& heroHand,
                                 const std::vector<std::string>& board,
                                 const std::vector<std::vector<uint8_t>>& opponentMasks,
                                 int iterations,
                                 unsigned seed) {
    EquityV2Result result;
    result.simulations = iterations;
    int nOpp = (int)opponentMasks.size();
    if (heroHand.size() != 2 || nOpp == 0 || iterations <= 0) return result;

    std::vector<Card> hero, community;
    for (auto& s : heroHand) hero.push_back(Card::fromNotation(s));
    for (auto& s : board) community.push_back(Card::fromNotation(s));

    bool used[52] = {false};
    for (auto& c : hero) used[HandRange::cardIdx(c)] = true;
    for (auto& c : community) used[HandRange::cardIdx(c)] = true;

    std::vector<HandRange> ranges;
    for (auto& m : opponentMasks) {
        HandRange r;
        for (int i = 0; i < HandRange::NUM_CLASSES && i < (int)m.size(); i++)
            r.setWeight(i, m[i]);
        ranges.push_back(r);
    }

    std::mt19937 rng(seed ? seed : (unsigned)std::chrono::steady_clock::now().time_since_epoch().count());

    double wins = 0, ties = 0;                       // double：避免v1平局截断
    double beat = 0, tie = 0, lose = 0;              // 逐对手范围透视计数
    std::map<int, std::pair<int,int>> classWL;       // 类idx -> {样本数, 胜次数}（每对手合并）

    std::vector<Card> fullBoard;
    for (int it = 0; it < iterations; it++) {
        bool iterUsed[52]; std::copy(used, used+52, iterUsed);
        std::vector<std::vector<Card>> opps(nOpp, std::vector<Card>(2));
        bool ok = true;
        for (int k = 0; k < nOpp && ok; k++) {
            Card c[2];
            if (!ranges[k].sample(rng, iterUsed, c)) { ok = false; break; }
            opps[k][0] = c[0]; opps[k][1] = c[1];
            iterUsed[HandRange::cardIdx(c[0])] = true;
            iterUsed[HandRange::cardIdx(c[1])] = true;
        }
        if (!ok) continue;
        fullBoard = community;
        Deck deck(rng());
        for (int i = 0; i < 52; i++) if (iterUsed[i]) {
            int r = i / 4 + 2, s = i % 4;
            deck.removeCard(Card((Card::Suit)s, (Card::Rank)r));
        }
        deck.shuffle();   // Deck(seed)构造不洗牌，必须显式shuffle否则每次迭代公共牌相同
        while (fullBoard.size() < 5) fullBoard.push_back(deck.drawCard());

        int heroScore = HandEvaluator::evaluateHand(hero, fullBoard);
        bool beaten = false, tied = false;
        for (int k = 0; k < nOpp; k++) {
            int oppScore = HandEvaluator::evaluateHand(opps[k], fullBoard);
            bool thisWin = heroScore > oppScore;
            if (oppScore > heroScore) beaten = true;
            else if (oppScore == heroScore) tied = true;
            // 透视统计：rank_index = 14 - getRank()（A=0..2=12，max的index更小）
            int idx = HandRange::classIndex(14 - (int)std::max(opps[k][0].getRank(), opps[k][1].getRank()),
                                            14 - (int)std::min(opps[k][0].getRank(), opps[k][1].getRank()),
                                            opps[k][0].getSuit() == opps[k][1].getSuit());
            auto& e = classWL[idx];
            if (thisWin) { beat += 1.0; e.second += 1; }
            else if (oppScore == heroScore) { tie += 1.0; }
            else { lose += 1.0; }
            e.first += 1;
        }
        if (!beaten && !tied) wins += 1;
        else if (!beaten && tied) ties += 1;
    }

    result.winRate = wins / iterations;
    result.tieRate = ties / iterations;
    result.lossRate = 1.0 - result.winRate - result.tieRate;
    result.rangeStats.beatPct = beat / (iterations * nOpp) * 100;
    result.rangeStats.tiePct  = tie / (iterations * nOpp) * 100;
    result.rangeStats.losePct = lose / (iterations * nOpp) * 100;

    // totalCombos：以初始占用（hero+board）计算每对手活组合之和的平均
    double live = 0;
    for (auto& r : ranges) live += r.liveCombos(used);
    result.rangeStats.totalCombos = (int)(live / nOpp + 0.5);

    // dangerHands：样本≥5的类中胜率最低的3个
    std::vector<std::pair<double,int>> ranked;
    for (auto& kv : classWL) {
        if (kv.second.first >= 5)
            ranked.push_back({ (double)kv.second.second / kv.second.first, kv.first });
    }
    std::sort(ranked.begin(), ranked.end());
    for (size_t i = 0; i < ranked.size() && i < 3; i++)
        result.rangeStats.dangerHands.push_back(HandRange::className(ranked[i].second));
    return result;
}
