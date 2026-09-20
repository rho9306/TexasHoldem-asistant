#include "card.h"
#include <algorithm>
#include <cctype>

// 静态成员初始化
const std::array<const char*, 5> Card::suitSymbols = {"♠", "♥", "♦", "♣", "?"};
const std::array<const char*, 5> Card::suitNotations = {"s", "h", "d", "c", ""};
const std::array<const char*, 15> Card::rankNotations = {
    "", "", "2", "3", "4", "5", "6", "7", "8", "9", "t", "j", "q", "k", "a"
};

Card::Card(Suit s, Rank r) : suit(s), rank(r) {
    // 确保不越界
    if (static_cast<int>(suit) < 0 || static_cast<int>(suit) > 4) {
        suit = SUIT_UNKNOWN;
    }
    if (static_cast<int>(rank) < 2 || static_cast<int>(rank) > 14) {
        rank = RANK_UNKNOWN;
    }
}

Card::Card(const std::string& notation) {
    if (notation.length() < 2) {
        suit = SUIT_UNKNOWN;
        rank = RANK_UNKNOWN;
        return;
    }

    std::string note = notation;

    // 转换为小写以便处理
    std::transform(note.begin(), note.end(), note.begin(), ::tolower);

    // 解析点数和花色
    rank = charToRank(note[0]);
    suit = charToSuit(note[1]);
}

int Card::getValue() const {
    // 返回用于比较的数值
    if (rank == RANK_UNKNOWN) return 0;
    return static_cast<int>(rank);
}

std::string Card::toString() const {
    if (isUnknown()) return "___";

    std::string result;

    // 添加点数
    switch (rank) {
        case TWO: result = "2"; break;
        case THREE: result = "3"; break;
        case FOUR: result = "4"; break;
        case FIVE: result = "5"; break;
        case SIX: result = "6"; break;
        case SEVEN: result = "7"; break;
        case EIGHT: result = "8"; break;
        case NINE: result = "9"; break;
        case TEN: result = "T"; break;
        case JACK: result = "J"; break;
        case QUEEN: result = "Q"; break;
        case KING: result = "K"; break;
        case ACE: result = "A"; break;
        default: result = "?"; break;
    }

    // 添加花色符号
    int suitIndex = static_cast<int>(suit);
    if (suitIndex >= 0 && suitIndex < 5) {
        result += suitSymbols[suitIndex];
    }

    return result;
}

std::string Card::toNotation() const {
    if (isUnknown()) return "__";

    std::string result;

    // 添加点数
    int rankIndex = static_cast<int>(rank);
    if (rankIndex >= 0 && rankIndex < 15) {
        result += rankNotations[rankIndex];
    }

    // 添加花色符号
    int suitIndex = static_cast<int>(suit);
    if (suitIndex >= 0 && suitIndex < 5) {
        result += suitNotations[suitIndex];
    }

    return result;
}

Card Card::fromNotation(const std::string& s) {
    return Card(s);  // 直接使用构造函数
}

bool Card::operator==(const Card& other) const {
    return suit == other.suit && rank == other.rank;
}

bool Card::operator!=(const Card& other) const {
    return !(*this == other);
}

bool Card::operator<(const Card& other) const {
    if (rank != other.rank) {
        return rank < other.rank;
    }
    return suit < other.suit;
}

bool Card::operator>(const Card& other) const {
    return other < *this;
}

bool Card::isUnknown() const {
    return suit == SUIT_UNKNOWN || rank == RANK_UNKNOWN;
}

void Card::setUnknown() {
    suit = SUIT_UNKNOWN;
    rank = RANK_UNKNOWN;
}

Card::Suit Card::charToSuit(char c) {
    switch (c) {
        case 's': return SPADES;
        case 'h': return HEARTS;
        case 'd': return DIAMONDS;
        case 'c': return CLUBS;
        default: return SUIT_UNKNOWN;
    }
}

Card::Rank Card::charToRank(char c) {
    switch (c) {
        case '2': return TWO;
        case '3': return THREE;
        case '4': return FOUR;
        case '5': return FIVE;
        case '6': return SIX;
        case '7': return SEVEN;
        case '8': return EIGHT;
        case '9': return NINE;
        case 't': return TEN;
        case 'j': return JACK;
        case 'q': return QUEEN;
        case 'k': return KING;
        case 'a': return ACE;
        default: return RANK_UNKNOWN;
    }
}