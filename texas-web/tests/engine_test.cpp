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
int main(){ testRangeStatic(); printf(fails? "FAILED %d\n":"ALL PASS\n", fails); return fails?1:0; }
