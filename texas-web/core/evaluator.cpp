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

    // 检查普通顺子
    int consecutive = 1;
    for (size_t i = 1; i < ranks.size(); i++) {
        if (ranks[i] == ranks[i-1] + 1) {
            consecutive++;
            if (consecutive >= 5) {
                highCard = ranks[i];
                return true;
            }
        } else {
            consecutive = 1;
        }
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

    // 检查同花顺
    int straightFlushHigh = 0;
    if (isStraightFlush(cards, straightFlushHigh)) {
        if (straightFlushHigh == 14) {
            return EvalResult(10000000, ROYAL_FLUSH, "皇家同花顺");
        }
        return EvalResult(9000000 + straightFlushHigh * 10000, STRAIGHT_FLUSH, "同花顺");
    }

    // 检查四条
    std::vector<int> rankCounts = getRankCounts(cards);
    for (size_t i = 0; i < rankCounts.size(); i++) {
        if (rankCounts[i] >= 4) {
            int quadRank = i + 2;  // +2因为Rank从2开始
            return EvalResult(8000000 + quadRank * 10000, FOUR_OF_A_KIND, "四条");
        }
    }

    // 检查葫芦
    bool hasTrips = false;
    bool hasPair = false;
    int tripsRank = 0, pairRank = 0;

    for (size_t i = 0; i < rankCounts.size(); i++) {
        if (rankCounts[i] >= 3) {
            hasTrips = true;
            tripsRank = std::max(tripsRank, static_cast<int>(i + 2));
        }
        if (rankCounts[i] >= 2) {
            hasPair = true;
            pairRank = std::max(pairRank, static_cast<int>(i + 2));
        }
    }

    if (hasTrips && hasPair) {
        return EvalResult(7000000 + tripsRank * 10000 + pairRank * 100, FULL_HOUSE, "葫芦");
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

        int flushScore = 0;
        int count = 0;

        for (int i = 14; i >= 2 && count < 5; i--) {
            for (const Card& card : cards) {
                if (card.getValue() == i && card.getSuit() == static_cast<Card::Suit>(flushSuit)) {
                    flushScore += i * static_cast<int>(pow(10, 4 - count));
                    count++;
                    break;
                }
            }
        }

        return EvalResult(6000000 + flushScore, FLUSH, "同花");
    }

    // 检查顺子
    int straightHigh = 0;
    if (isStraight(cards, straightHigh)) {
        return EvalResult(5000000 + straightHigh * 10000, STRAIGHT, "顺子");
    }

    // 检查三条
    if (hasTrips) {
        return EvalResult(4000000 + tripsRank * 10000, THREE_OF_A_KIND, "三条");
    }

    // 检查两对
    int pairs = 0;
    int highPair = 0, lowPair = 0;
    int kicker = 0;

    for (size_t i = rankCounts.size() - 1; i >= 2; i--) {
        if (rankCounts[i] >= 2) {
            int pairRank = static_cast<int>(i + 2);
            if (pairs == 0) {
                highPair = pairRank;
            } else if (pairs == 1) {
                lowPair = pairRank;
            }
            pairs++;
        } else if (kicker == 0 && rankCounts[i] > 0) {
            kicker = static_cast<int>(i + 2);
        }
    }

    if (pairs >= 2) {
        return EvalResult(3000000 + highPair * 10000 + lowPair * 100 + kicker, TWO_PAIR, "两对");
    }

    // 检查一对
    if (pairs == 1) {
        return EvalResult(2000000 + highPair * 10000, ONE_PAIR, "一对");
    }

    // 高牌
    int highCard = 0;
    for (const Card& card : cards) {
        highCard = std::max(highCard, card.getValue());
    }

    return EvalResult(1000000 + highCard * 10000, HIGH_CARD, "高牌");
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