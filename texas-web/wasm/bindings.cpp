#include <emscripten/bind.h>
#include <string>
#include <vector>
#include "equity_v2.h"
using namespace emscripten;

int ping() { return 42; }

// JS侧保持4参API（seed可选参数不暴露，内部默认时钟播种）
static EquityV2Result calculateEquityV2Js(const std::vector<std::string>& heroHand,
                                          const std::vector<std::string>& board,
                                          const std::vector<std::vector<uint8_t>>& opponentMasks,
                                          int iterations) {
    return calculateEquityV2(heroHand, board, opponentMasks, iterations);
}

EMSCRIPTEN_BINDINGS(poker_core) {
  function("ping", &ping);

  register_vector<std::string>("VectorString");
  register_vector<uint8_t>("VectorU8");
  register_vector<std::vector<uint8_t>>("VectorVectorU8");

  value_object<RangeStatsV2>("RangeStats")
    .field("totalCombos", &RangeStatsV2::totalCombos)
    .field("beatPct", &RangeStatsV2::beatPct)
    .field("tiePct", &RangeStatsV2::tiePct)
    .field("losePct", &RangeStatsV2::losePct)
    .field("dangerHands", &RangeStatsV2::dangerHands);

  value_object<EquityV2Result>("EquityV2Result")
    .field("winRate", &EquityV2Result::winRate)
    .field("tieRate", &EquityV2Result::tieRate)
    .field("lossRate", &EquityV2Result::lossRate)
    .field("simulations", &EquityV2Result::simulations)
    .field("rangeStats", &EquityV2Result::rangeStats);

  function("calculateEquityV2", &calculateEquityV2Js);
}
