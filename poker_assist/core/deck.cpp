#include "deck.h"
#include <algorithm>
#include <chrono>

Deck::Deck() : rng(std::chrono::steady_clock::now().time_since_epoch().count()) {
    initializeDeck();
}

Deck::Deck(unsigned int seed) : rng(seed) {
    initializeDeck();
}

void Deck::initializeDeck() {
    cards.clear();

    // 创建完整的52张牌
    for (int s = 0; s < 4; s++) {
        for (int r = 2; r <= 14; r++) {
            Card::Suit suit = static_cast<Card::Suit>(s);
            Card::Rank rank = static_cast<Card::Rank>(r);
            cards.push_back(Card(suit, rank));
        }
    }
}

void Deck::shuffle() {
    std::shuffle(cards.begin(), cards.end(), rng);
}

Card Deck::drawCard() {
    if (cards.empty()) {
        return Card();  // 返回未知牌
    }

    Card card = cards.back();
    cards.pop_back();
    return card;
}

void Deck::reset() {
    initializeDeck();
}

void Deck::removeCards(const std::vector<Card>& cardsToRemove) {
    for (const Card& card : cardsToRemove) {
        removeCard(card);
    }
}

void Deck::removeCard(const Card& card) {
    if (card.isUnknown()) {
        return;  // 跳过未知牌
    }

    auto it = std::find(cards.begin(), cards.end(), card);
    if (it != cards.end()) {
        cards.erase(it);
    }
}

int Deck::remainingCount() const {
    return static_cast<int>(cards.size());
}

std::vector<Card> Deck::getRemainingCards() const {
    return cards;
}

bool Deck::hasCard(const Card& card) const {
    if (card.isUnknown()) {
        return false;
    }

    auto it = std::find(cards.begin(), cards.end(), card);
    return it != cards.end();
}

bool Deck::isEmpty() const {
    return cards.empty();
}

void Deck::setSeed(unsigned int seed) {
    rng.seed(seed);
}