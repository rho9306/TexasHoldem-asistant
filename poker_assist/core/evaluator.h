#ifndef EVALUATOR_H
#define EVALUATOR_H

#include "card.h"
#include <vector>

class HandEvaluator {
public:
    // 牌型等级
    enum HandRank {
        HIGH_CARD = 1,
        ONE_PAIR,
        TWO_PAIR,
        THREE_OF_A_KIND,
        STRAIGHT,
        FLUSH,
        FULL_HOUSE,
        FOUR_OF_A_KIND,
        STRAIGHT_FLUSH,
        ROYAL_FLUSH
    };

    // 评估结果结构
    struct EvalResult {
        int score;
        HandRank rank;
        std::string description;

        EvalResult() : score(0), rank(HIGH_CARD), description("") {}
        EvalResult(int s, HandRank r, const std::string& desc)
            : score(s), rank(r), description(desc) {}
    };

    // 评估函数
    static int evaluateHand(const std::vector<Card>& hand,
                           const std::vector<Card>& board);

    static EvalResult evaluateHandDetailed(const std::vector<Card>& hand,
                                          const std::vector<Card>& board);

    // 比较函数
    static bool beats(const std::vector<Card>& myHand,
                     const std::vector<Card>& opponentHand,
                     const std::vector<Card>& board);

    static int compareHands(const std::vector<Card>& hand1,
                           const std::vector<Card>& hand2,
                           const std::vector<Card>& board);

    // 获取牌型描述
    static std::string getHandRank(int score);
    static HandRank getHandRankEnum(int score);
    static std::string getHandRankName(HandRank rank);

private:
    // 内部辅助方法
    static std::vector<Card> combineCards(const std::vector<Card>& hand,
                                         const std::vector<Card>& board);

    static bool isFlush(const std::vector<Card>& cards);
    static bool isStraight(const std::vector<Card>& cards, int& highCard);
    static bool isStraightFlush(const std::vector<Card>& cards, int& highCard);

    static EvalResult evaluateSevenCards(const std::vector<Card>& cards);

    // 牌型检测辅助方法
    static int countPairs(const std::vector<Card>& cards);
    static int countTrips(const std::vector<Card>& cards);
    static int countQuads(const std::vector<Card>& cards);

    static std::vector<int> getRankCounts(const std::vector<Card>& cards);
    static std::vector<int> getSuitCounts(const std::vector<Card>& cards);
};

#endif // EVALUATOR_H