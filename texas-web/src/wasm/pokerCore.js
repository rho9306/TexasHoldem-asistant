// WASM 引擎加载器。?url 引入 wasm 二进制：dev 由 vite 直接伺服，prod 构建发出
// assets/poker_core-<hash>.wasm 并回写 URL；经 locateFile 显式传给胶水——
// 否则胶水按自身 scriptDirectory 拼路径，而 vite 静态分析看不到动态拼接，
// 部署站会因 dist 缺 .wasm 而 404（「加载计算引擎失败」的根因）。
import wasmUrl from './poker_core.wasm?url';

let corePromise = null;
export function getCore() {
  if (!corePromise) {
    corePromise = import('./poker_core.js')
      .then(m => m.default.createPokerCore({ locateFile: () => wasmUrl }))
      .catch(err => { corePromise = null; throw err; });
  }
  return corePromise;
}

// 批次16：启动预热——打开页面即后台实例化引擎。成功后胶水+wasm 的响应经 SW
// 静态资源处理器写入缓存（弱网/离线二次访问可用），首次选牌也免引擎加载等待；
// 失败静默不产生未处理拒绝（corePromise 已在 getCore 内复位，下次 recalc 或刷新
// 页面自动重试），仅留一条 debug 级日志供排查。
export function warmEngine() { getCore().catch(e => console.debug('engine warmup skipped:', e)); }
