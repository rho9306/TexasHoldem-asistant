#include "evaluator.h"
#include <algorithm>
#include <map>
#include <cmath>

int HandEvaluator::evaluateHand(const std::vector<Card>& hand,
                               const std::vector<Card>& board) {
    return evaluateHandDetailed(hand, board).score;
}

HandEvaluator::EvalResult HandEvaluator::evaluateHandDetailed(
    const std::vector<Card>& hand,
    const std::vector<Card>& board) {

    std::vector<Card> allCards = combineCards(hand, board);
    return evaluateSevenCards(allCards);
}

bool HandEvaluator::beats(const std::vector<Card>& myHand,
                         const std::vector<Card>& opponentHand,
                         const std::vector<Card>& board) {
    return compareHands(myHand, opponentHand, board) > 0;
}

int HandEvaluator::compareHands(const std::vector<Card>& hand1,
                                const std::vector<Card>& hand2,
                                const std::vector<Card>& board) {
    int score1 = evaluateHand(hand1, board);
    int score2 = evaluateHand(hand2, board);

    if (score1 > score2) return 1;
    if (score1 < score2) return -1;
    return 0;
}

std::string HandEvaluator::getHandRank(int score) {
    return getHandRankName(getHandRankEnum(score));
}

HandEvaluator::HandRank HandEvaluator::getHandRankEnum(int score) {
    int rankValue = score / 1000000;
    return static_cast<HandRank>(rankValue);
}

std::string HandEvaluator::getHandRankName(HandRank rank) {
    switch (rank) {
        case HIGH_CARD: return "高牌";
        case ONE_PAIR: return "一对";
        case TWO_PAIR: return "两对";
        case THREE_OF_A_KIND: return "三条";
        case STRAIGHT: return "顺子";
        case FLUSH: return "同花";
        case FULL_HOUSE: return "葫芦";
        case FOUR_OF_A_KIND: return "四条";
        case STRAIGHT_FLUSH: return "同花顺";
        case ROYAL_FLUSH: return "皇家同花顺";
        default: return "未知";
    }
}

// ==================== 私有方法实现 ====================

std::vector<Card> HandEvaluator::combineCards(const std::vector<Card>& hand,
                                            const std::vector<Card>& board) {
    std::vector<Card> allCards = hand;
    allCards.insert(allCards.end(), board.begin(), board.end());
    return allCards;
}

bool HandEvaluator::isFlush(const std::vector<Card>& cards) {
    std::vector<int> suitCounts = getSuitCounts(cards);

    for (int count : suitCounts) {
        if (count >= 5) return true;
    }
    return false;
}

bool HandEvaluator::isStraight(const std::vector<Card>& cards, int& highCard) {
    if (cards.size() < 5) return false;

    // 提取所有点数并去重排序
    std::vector<int> ranks;
    for (const Card& card : cards) {
        int rank = card.getValue();
        if (rank != 0 && std::find(ranks.begin(), ranks.end(), rank) == ranks.end()) {
            ranks.push_back(rank);
        }
    }

    if (ranks.size() < 5) return false;

    std::sort(ranks.begin(), ranks.end());

    // 检查普通顺子（修复：扫描最长连牌段，避免6+连张时提前按低6张返回）
    int consecutive = 1;
    int bestHigh = 0;
    for (size_t i = 1; i < ranks.size(); i++) {
        if (ranks[i] == ranks[i-1] + 1) {
            consecutive++;
            if (consecutive >= 5) {
                bestHigh = ranks[i];
            }
        } else {
            consecutive = 1;
        }
    }
    if (bestHigh > 0) {
        highCard = bestHigh;
        return true;
    }

    // 检查A-2-3-4-5顺子（轮子）
    if (std::find(ranks.begin(), ranks.end(), 14) != ranks.end() &&  // A
        std::find(ranks.begin(), ranks.end(), 2) != ranks.end() &&   // 2
        std::find(ranks.begin(), ranks.end(), 3) != ranks.end() &&   // 3
        std::find(ranks.begin(), ranks.end(), 4) != ranks.end() &&   // 4
        std::find(ranks.begin(), ranks.end(), 5) != ranks.end()) {    // 5
        highCard = 5;
        return true;
    }

    return false;
}

bool HandEvaluator::isStraightFlush(const std::vector<Card>& cards, int& highCard) {
    if (cards.size() < 5) return false;

    // 按花色分组
    std::map<Card::Suit, std::vector<Card>> suitGroups;

    for (const Card& card : cards) {
        if (!card.isUnknown()) {
            suitGroups[card.getSuit()].push_back(card);
        }
    }

    // 检查每种花色是否有顺子
    for (auto& pair : suitGroups) {
        if (pair.second.size() >= 5) {
            if (isStraight(pair.second, highCard)) {
                return true;
            }
        }
    }

    return false;
}

HandEvaluator::EvalResult HandEvaluator::evaluateSevenCards(const std::vector<Card>& cards) {
    if (cards.size() < 5) {
        return EvalResult(0, HIGH_CARD, "牌数不足");
    }

    // 5个rank按降序打包成 base-15 整数（含所有踢脚，保证同牌型间完整比较）
    std::vector<int> rankCounts = getRankCounts(cards);
    auto pack5 = [](std::vector<int> rs) {
        // 注意：rs必须已按比较优先级排列（如两对=大对x2,小对x2,踢脚），不得重排
        while (rs.size() < 5) rs.push_back(0);
        int s = 0;
        for (int i = 0; i < 5; i++) s = s * 15 + rs[i];
        return s;   // 最大 14*15^4+... = 759374 < 1000000
    };
    auto topKickers = [&](const std::vector<int>& excludeRanks, int need) {
        // 取 excludeRanks 之外最大的 need 张单牌rank
        std::vector<int> out;
        for (int i = (int)rankCounts.size() - 1; i >= 0 && (int)out.size() < need; i--) {
            int rk = static_cast<int>(i);
            if (rankCounts[i] == 0) continue;
            if (std::find(excludeRanks.begin(), excludeRanks.end(), rk) != excludeRanks.end()) continue;
            for (int k = 0; k < rankCounts[i] && (int)out.size() < need; k++) out.push_back(rk);
        }
        return out;
    };

    // 检查同花顺
    int straightFlushHigh = 0;
    if (isStraightFlush(cards, straightFlushHigh)) {
        if (straightFlushHigh == 14) {
            return EvalResult(10000000, ROYAL_FLUSH, "皇家同花顺");
        }
        return EvalResult(9000000 + pack5({straightFlushHigh, straightFlushHigh-1, straightFlushHigh-2, straightFlushHigh-3, straightFlushHigh==5?5:straightFlushHigh-4}), STRAIGHT_FLUSH, "同花顺");
    }

    // 检查四条
    for (size_t i = 0; i < rankCounts.size(); i++) {
        if (rankCounts[i] >= 4) {
            int quadRank = static_cast<int>(i);  // rankCounts按rank值索引(2-14)
            std::vector<int> ranks = {quadRank, quadRank, quadRank, quadRank};
            int kick = 0;
            for (auto k : topKickers({quadRank}, 1)) kick = k;
            ranks.push_back(kick);
            return EvalResult(8000000 + pack5(ranks), FOUR_OF_A_KIND, "四条");
        }
    }

    // 检查葫芦（修复：三条不再同时计为对子；两条三条取低者作对）
    bool hasTrips = false;
    bool hasPair = false;
    int tripsRank = 0, secondTripsRank = 0, pairRank = 0;

    for (size_t i = 0; i < rankCounts.size(); i++) {
        int cnt = rankCounts[i];
        int rk = static_cast<int>(i);
        if (cnt >= 3) {
            hasTrips = true;
            secondTripsRank = tripsRank;
            tripsRank = std::max(tripsRank, rk);
        } else if (cnt == 2) {
            hasPair = true;
            pairRank = std::max(pairRank, rk);
        }
    }
    if (secondTripsRank > 0) {
        hasPair = true;   // 两条三条 = 葫芦（低三条作对子）
        pairRank = std::max(pairRank, secondTripsRank);
    }

    if (hasTrips && hasPair) {
        return EvalResult(7000000 + pack5({tripsRank, tripsRank, tripsRank, pairRank, pairRank}), FULL_HOUSE, "葫芦");
    }

    // 检查同花
    if (isFlush(cards)) {
        // 找到最大的五张同花牌
        std::vector<int> suitCounts = getSuitCounts(cards);
        int flushSuit = -1;

        for (size_t i = 0; i < suitCounts.size(); i++) {
            if (suitCounts[i] >= 5) {
                flushSuit = static_cast<Card::Suit>(i);
                break;
            }
        }

        std::vector<int> flushRanks;
        for (int i = 14; i >= 2 && (int)flushRanks.size() < 5; i--) {
            for (const Card& card : cards) {
                if (card.getValue() == i && card.getSuit() == static_cast<Card::Suit>(flushSuit)) {
                    flushRanks.push_back(i);
                    break;
                }
            }
        }

        return EvalResult(6000000 + pack5(flushRanks), FLUSH, "同花");
    }

    // 检查顺子
    int straightHigh = 0;
    if (isStraight(cards, straightHigh)) {
        return EvalResult(5000000 + pack5({straightHigh, straightHigh-1, straightHigh-2, straightHigh-3, straightHigh==5?5:straightHigh-4}), STRAIGHT, "顺子");
    }

    // 检查三条
    if (hasTrips) {
        std::vector<int> ranks = {tripsRank, tripsRank, tripsRank};
        auto ks = topKickers({tripsRank}, 2);
        ranks.push_back(ks.empty() ? 0 : ks[0]);
        ranks.push_back(ks.size() < 2 ? 0 : ks[1]);
        return EvalResult(4000000 + pack5(ranks), THREE_OF_A_KIND, "三条");
    }

    // 检查两对
    int pairs = 0;
    int highPair = 0, lowPair = 0;
    int kicker = 0;

    for (int i = static_cast<int>(rankCounts.size()) - 1; i >= 0; i--) {   // 修复：覆盖rank 2/3
        if (rankCounts[i] >= 2) {
            int pr = static_cast<int>(i);
            if (pairs == 0) {
                highPair = pr;
            } else if (pairs == 1) {
                lowPair = pr;
            }
            pairs++;
        } else if (kicker == 0 && rankCounts[i] > 0) {
            kicker = static_cast<int>(i);
        }
    }

    if (pairs >= 2) {
        return EvalResult(3000000 + pack5({highPair, highPair, lowPair, lowPair, kicker}), TWO_PAIR, "两对");
    }

    // 检查一对
    if (pairs == 1) {
        std::vector<int> ranks = {highPair, highPair};
        for (auto k : topKickers({highPair}, 3)) ranks.push_back(k);
        return EvalResult(2000000 + pack5(ranks), ONE_PAIR, "一对");
    }

    // 高牌
    return EvalResult(1000000 + pack5(topKickers({}, 5)), HIGH_CARD, "高牌");
}

int HandEvaluator::countPairs(const std::vector<Card>& cards) {
    std::vector<int> rankCounts = getRankCounts(cards);
    int pairs = 0;

    for (int count : rankCounts) {
        if (count >= 2) pairs++;
    }

    return pairs;
}

int HandEvaluator::countTrips(const std::vector<Card>& cards) {
    std::vector<int> rankCounts = getRankCounts(cards);
    int trips = 0;

    for (int count : rankCounts) {
        if (count >= 3) trips++;
    }

    return trips;
}

int HandEvaluator::countQuads(const std::vector<Card>& cards) {
    std::vector<int> rankCounts = getRankCounts(cards);
    int quads = 0;

    for (int count : rankCounts) {
        if (count >= 4) quads++;
    }

    return quads;
}

std::vector<int> HandEvaluator::getRankCounts(const std::vector<Card>& cards) {
    std::vector<int> counts(15, 0);  // 索引0-14，对应2-A

    for (const Card& card : cards) {
        int rank = card.getValue();
        if (rank >= 2 && rank <= 14) {
            counts[rank]++;
        }
    }

    return counts;
}

std::vector<int> HandEvaluator::getSuitCounts(const std::vector<Card>& cards) {
    std::vector<int> counts(4, 0);  // ♠♥♦♣

    for (const Card& card : cards) {
        if (!card.isUnknown()) {
            int suit = static_cast<int>(card.getSuit());
            if (suit >= 0 && suit < 4) {
                counts[suit]++;
            }
        }
    }

    return counts;
}