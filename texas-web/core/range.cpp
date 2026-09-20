#include "range.h"
#include <cstdio>

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
