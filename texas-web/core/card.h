#ifndef CARD_H
#define CARD_H

#include <string>
#include <array>

class Card {
public:
    enum Suit { SPADES, HEARTS, DIAMONDS, CLUBS, SUIT_UNKNOWN };
    enum Rank { TWO=2, THREE, FOUR, FIVE, SIX, SEVEN, EIGHT,
               NINE, TEN, JACK, QUEEN, KING, ACE, RANK_UNKNOWN };

private:
    Suit suit;
    Rank rank;

    // 静态数组用于字符串转换
    static const std::array<const char*, 5> suitSymbols;
    static const std::array<const char*, 5> suitNotations;
    static const std::array<const char*, 15> rankNotations;

public:
    // 构造函数
    Card(Suit s = SUIT_UNKNOWN, Rank r = RANK_UNKNOWN);
    Card(const std::string& notation);  // "As", "Kh" etc.

    // 获取方法
    Suit getSuit() const { return suit; }
    Rank getRank() const { return rank; }
    int getValue() const;  // 用于比较的数值

    // 字符串转换
    std::string toString() const;        // "A♠"
    std::string toNotation() const;      // "As"
    static Card fromNotation(const std::string& s);

    // 比较操作
    bool operator==(const Card& other) const;
    bool operator!=(const Card& other) const;
    bool operator<(const Card& other) const;
    bool operator>(const Card& other) const;

    // 辅助方法
    bool isUnknown() const;
    void setUnknown();

private:
    static Suit charToSuit(char c);
    static Rank charToRank(char c);
};

#endif // CARD_H