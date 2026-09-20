#include <cassert>
#include <cstdio>
#include <string>
#include "range.h"
#define CHECK(cond) do{ if(!(cond)){ printf("FAIL %s:%d: %s\n",__FILE__,__LINE__,#cond); fails++; } }while(0)
int fails = 0;
static void testRangeStatic() {
  CHECK(HandRange::classIndex(0,0,true) == 0);            // AA
  CHECK(HandRange::classIndex(0,1,true) == 1);            // AKs
  CHECK(HandRange::classIndex(0,1,false) == 13);          // AKo -> lo*13+hi = 1*13+0（hi>=lo 约定）
  CHECK(std::string(HandRange::className(0)) == "AA");
  CHECK(std::string(HandRange::className(1)) == "AKs");
  CHECK(std::string(HandRange::className(13)) == "AKo");
  CHECK(std::string(HandRange::className(167)) == "32o"); // 下三角末格：lo*13+hi = 12*13+11
  CHECK(std::string(HandRange::className(168)) == "22");  // 对角线末格：口袋对无花色后缀
  CHECK(HandRange::combosOfClass(0) == 6);
  CHECK(HandRange::combosOfClass(1) == 4);
  CHECK(HandRange::combosOfClass(13) == 12);
  int hi,lo; bool s;
  HandRange::classRanks(1, hi, lo, s); CHECK(hi==0 && lo==1 && s);
  HandRange::classRanks(13, hi, lo, s); CHECK(hi==0 && lo==1 && !s);
  HandRange r; // 默认全100
  int total = 0;
  for (int i=0;i<169;i++){ total += r.weight(i)*HandRange::combosOfClass(i)/100; }
  CHECK(total == 1326);
  r.setWeight(0, 0);
  CHECK(r.weight(0) == 0);
}
static void testRangeSample() {
  std::mt19937 rng(12345);
  // 1) 全100权重：AA出现频率 ≈ 6/1326 = 0.4525%（容差0.30%~0.60%）
  HandRange full; bool used[52] = {false};
  int aaCount = 0;
  auto idxOf = [](const Card& a, const Card& b) {
    int ra = a.getRank(), rb = b.getRank();
    int hi = ra > rb ? ra : rb, lo = ra > rb ? rb : ra;
    return HandRange::classIndex(14 - hi, 14 - lo, a.getSuit() == b.getSuit());
  };
  for (int i = 0; i < 10000; i++) {
    Card c[2];
    CHECK(full.sample(rng, used, c));
    CHECK(c[0].getRank() != c[1].getRank() || c[0].getSuit() != c[1].getSuit());
    if (idxOf(c[0], c[1]) == 0) aaCount++;  // AA idx=0
  }
  double freq = aaCount / 10000.0;
  CHECK(freq > 0.0030 && freq < 0.0060);

  // 2) 单一类权重：只留AKs（4组合）必须100%抽到AKs
  HandRange onlyAKs;
  for (int i = 0; i < 169; i++) onlyAKs.setWeight(i, (uint8_t)(i == 1 ? 100 : 0));
  for (int i = 0; i < 500; i++) {
    Card c[2];
    CHECK(onlyAKs.sample(rng, used, c));
    CHECK(idxOf(c[0], c[1]) == 1);
  }

  // 3) 占用避让：拿走A♠K♠后，AKs仍能抽到（剩余3组合，全非双黑桃）
  bool used2[52] = {false};
  Card as("As"), ks("Ks");
  used2[HandRange::cardIdx(as)] = true;
  used2[HandRange::cardIdx(ks)] = true;
  CHECK(onlyAKs.liveCombos(used2) == 3);
  for (int i = 0; i < 100; i++) {
    Card c[2];
    CHECK(onlyAKs.sample(rng, used2, c));
    CHECK(!(c[0].getSuit() == Card::SPADES && c[1].getSuit() == Card::SPADES));
  }

  // 4) 全占用失败：拿走全部A*K*后 AKs/AKo 均无组合 → sample返回false
  bool used3[52] = {false};
  for (int s = 0; s < 4; s++) {
    Card a(std::string("A") + "shdc"[s]);
    Card k(std::string("K") + "shdc"[s]);
    used3[HandRange::cardIdx(a)] = true;
    used3[HandRange::cardIdx(k)] = true;
  }
  Card c[2];
  CHECK(!onlyAKs.sample(rng, used3, c));
  CHECK(onlyAKs.liveCombos(used3) == 0);

  // 5) liveCombos：全范围占用A♠后 = 1326 - 3(AA) - 36(12个异花Ax类各失3) - 12(12个同花Ax类各失1)
  bool used4[52] = {false};
  used4[HandRange::cardIdx(Card("As"))] = true;
  CHECK(full.liveCombos(used4) == 1275);
  CHECK(full.liveCombos(used) == 1326);
}

int main(){ testRangeStatic(); testRangeSample(); printf(fails? "FAILED %d\n":"ALL PASS\n", fails); return fails?1:0; }
