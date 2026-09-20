#ifndef DECK_H
#define DECK_H

#include "card.h"
#include <vector>
#include <random>

class Deck {
private:
    std::vector<Card> cards;
    std::mt19937 rng;

    // 初始化完整牌堆
    void initializeDeck();

public:
    Deck();
    explicit Deck(unsigned int seed);

    // 牌堆操作
    void shuffle();                      // 洗牌
    Card drawCard();                     // 抽一张牌
    void reset();                        // 重置为完整52张牌
    void removeCards(const std::vector<Card>&);  // 移除已知牌
    void removeCard(const Card&);        // 移除单张牌

    // 查询方法
    int remainingCount() const;
    std::vector<Card> getRemainingCards() const;
    bool hasCard(const Card& card) const;
    bool isEmpty() const;

    // 随机数种子
    void setSeed(unsigned int seed);
};

#endif // DECK_H