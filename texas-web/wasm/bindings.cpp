#include <emscripten/bind.h>
#include <string>
#include <vector>
using namespace emscripten;

int ping() { return 42; }
EMSCRIPTEN_BINDINGS(poker_core) { function("ping", &ping); }
