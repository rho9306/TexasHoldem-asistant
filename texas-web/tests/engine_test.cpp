#include <cassert>
#include <cstdio>
#include <string>
#include <cmath>
#include <vector>
#include <cstdint>
#include "range.h"
#include "equity_v2.h"
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

static std::vector<std::vector<uint8_t>> uniformMask() {
  return { std::vector<uint8_t>(169, 100) };
}
static void testEquityV2() {
  // 基准1：皇家同花顺已成立 vs 任意范围 = 100% 胜
  {
    auto r = calculateEquityV2({"As","Ks"}, {"Ts","Js","Qs","2h","3d"}, uniformMask(), 500);
    CHECK(r.winRate == 1.0);
  }
  // 基准2：AA vs 1个均匀随机 ≈ 85% → effective = win + tie/2 ∈ (83,87)
  {
    auto r = calculateEquityV2({"As","Ad"}, {}, uniformMask(), 5000);
    double eff = r.winRate + r.tieRate * 0.5;
    CHECK(eff > 0.83 && eff < 0.87);
  }
  // 基准3：AA vs 前10%范围（计划的22类清单，约130组合）≈ 84.5%±1.5
  // 校准依据（§9.1）：该清单经独立穷举验证（无采样器、独立Python评估器交叉验证0分歧），
  // AA vs 此范围 = 84.5%；计划中"≈82%"的先验与其自带的清单不一致，故按实测+穷举校准
  {
    const char* top22[] = {"AA","KK","QQ","JJ","TT","99","88","77","AKs","AQs","AJs","ATs","AKo","AQo","A9s","AJo","KQs","KJs","KQo","A8s","K9s","QJs"};
    std::vector<uint8_t> m(169, 0);
    for (auto* name : top22)
      for (int i = 0; i < 169; i++)
        if (std::string(HandRange::className(i)) == name) m[i] = 100;
    auto r = calculateEquityV2({"As","Ad"}, {}, {m}, 5000);
    double eff = r.winRate + r.tieRate * 0.5;
    CHECK(eff > 0.83 && eff < 0.86);
  }
  // 基准4：重复模拟稳定性：同seed完全可复现；不同seed差异 <4%（2000次MC统计噪声约±1.5%）
  {
    auto a = calculateEquityV2({"As","Ks"}, {}, uniformMask(), 2000, 42);
    auto b = calculateEquityV2({"As","Ks"}, {}, uniformMask(), 2000, 42);
    CHECK(a.winRate == b.winRate);
    auto c = calculateEquityV2({"As","Ks"}, {}, uniformMask(), 2000, 777);
    CHECK(std::abs(a.winRate - c.winRate) < 0.04);
  }
  // 基准5：范围透视 totalCombos：全范围占用A♠A♦后 = 1326 - 5(AA) - 72(12异花Ax各失6) - 24(12同花Ax各失2) = 1225
  {
    auto r = calculateEquityV2({"As","Ad"}, {}, uniformMask(), 100);
    CHECK(r.rangeStats.totalCombos == 1225);
  }
  // 基准6：72o vs 1随机 ≈ 35%±2
  {
    auto r = calculateEquityV2({"7c","2d"}, {}, uniformMask(), 5000);
    double eff = r.winRate + r.tieRate * 0.5;
    CHECK(eff > 0.33 && eff < 0.37);
  }
  // 透视归一：uniform 全范围 beat+tie+lose ≈ 100%
  {
    auto r = calculateEquityV2({"As","Ks"}, {}, uniformMask(), 2000);
    double sum = r.rangeStats.beatPct + r.rangeStats.tiePct + r.rangeStats.losePct;
    CHECK(sum > 99.0 && sum < 101.0);
    CHECK(r.lossRate > 0 && r.lossRate < 1);
  }
  // 分母守恒：窄范围（只留2类）×多对手×500次——失败迭代不计入分母
  {
    std::vector<uint8_t> m(169, 0);
    for (int i = 0; i < 169; i++) {
      std::string n = HandRange::className(i);
      if (n == "AA" || n == "KK") m[i] = 100;
    }
    std::vector<std::vector<uint8_t>> masks = {m, m, m};  // 3个同样窄范围对手
    auto r = calculateEquityV2({"As","Ad"}, {}, masks, 500);
    CHECK(r.winRate >= 0 && r.winRate <= 1);
    CHECK(r.simulations >= 1 && r.simulations <= 500);
    double pct = r.rangeStats.beatPct + r.rangeStats.tiePct + r.rangeStats.losePct;
    CHECK(std::abs(pct - 100.0) < 0.5);
    CHECK(r.simulations <= 500 && r.simulations > 0);
  }
}

static void testDecision() {
  // brief修正：potOdds = pot/call = 100/25 = 4（brief原文"0.25/25-100"与其requiredEquity=1/5自相矛盾）
  auto r = evaluateDecision(0.55, 100, 25, 75, "standard");
  CHECK(std::abs(r.potOdds - 4.0) < 1e-9);
  CHECK(std::abs(r.requiredEquity - 1.0/5.0) < 1e-9);
  CHECK(std::abs(r.evCall - (0.55*100 - 0.45*25)) < 1e-9);
  CHECK(r.evRaise > 0);
  CHECK(r.adviceLevel == "raise" || r.adviceLevel == "call");
  auto strong = evaluateDecision(0.85, 100, 25, 75, "standard");
  CHECK(strong.adviceLevel == "raise");
  auto weak = evaluateDecision(0.10, 100, 25, 75, "standard");
  CHECK(weak.adviceLevel == "fold");
  // 风格区分用例：requiredEquity=1/(100/25+1)=0.2，基准diff=0.315-0.2=0.115
  // standard 0.115→raise；conservative 0.115-0.02=0.095→略微跟注(call)；aggressive 0.115+0.02=0.135→raise
  auto cons = evaluateDecision(0.315, 100, 25, 75, "conservative");
  auto aggr = evaluateDecision(0.315, 100, 25, 75, "aggressive");
  auto std_ = evaluateDecision(0.315, 100, 25, 75, "standard");
  auto lvl = [](const DecisionResult& d){ return d.adviceLevel=="raise"?3 : d.adviceLevel=="call"?2 : d.adviceLevel=="neutral"?1 : 0; };
  CHECK(lvl(aggr) > lvl(cons));
  CHECK(lvl(cons) == 2);
  CHECK(lvl(std_) == 3);
}
int main(){ testRangeStatic(); testRangeSample(); testEquityV2(); testDecision(); printf(fails? "FAILED %d\n":"ALL PASS\n", fails); return fails?1:0; }
