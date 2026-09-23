// WASM 引擎加载器。批次17：wasm 以 base64 内联进主包（?inline），经 emscripten 标准的
// wasmBinary 参数直接实例化——引擎不再发起任何独立网络请求，随页面一起到位。
// 根治批次16 后仍存在的加载失败：弱网窗口/移动端后台回收恢复（页面生命周期静默重建，
// 引擎资产需重新拉取恰逢网络不通）。只要页面能打开，引擎就一定可用。
// 胶水同时由动态导入改为静态导入（引擎相关网络请求 2 个 → 0 个）。
import * as glueModule from './poker_core.js';
import wasmDataUrl from './poker_core.wasm?inline';

// 胶水是 UMD/CJS 产物，三种互操作形状并存：vite 构建互op(default.createPokerCore)、
// vitest 原样 CJS(default 即函数本体)、测试 mock(default.createPokerCore)。统一在此归一。
function resolveCreatePokerCore() {
  const d = glueModule.default;
  return d?.createPokerCore ?? glueModule.createPokerCore ?? d;
}

// 字节级实例化：此版胶水不读取 wasmBinary 选项（精简构建），但支持标准
// instantiateWasm(info, receiveInstance) 钩子——内联字节直接 WebAssembly.instantiate，
// 引擎加载彻底不经过任何 URL/fetch 层。
function instantiateWasm(info, receiveInstance) {
  WebAssembly.instantiate(getWasmBinary(), info)
    .then(({ instance }) => receiveInstance(instance))
    .catch(e => console.error('wasm instantiate failed:', e));
}

let wasmBytes = null;
function getWasmBinary() {
  if (!wasmBytes) {
    const b64 = wasmDataUrl.slice(wasmDataUrl.indexOf(',') + 1);
    const bin = atob(b64);
    wasmBytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) wasmBytes[i] = bin.charCodeAt(i);
  }
  return wasmBytes;
}

let corePromise = null;
export function getCore() {
  if (!corePromise) {
    corePromise = Promise.resolve(resolveCreatePokerCore()({ instantiateWasm }))
      .catch(err => { corePromise = null; throw err; });
  }
  return corePromise;
}

// 批次16：启动预热——打开页面即后台实例化引擎（批次17 起纯 CPU 操作、零网络请求），
// 首次选牌免引擎实例化等待；失败静默不产生未处理拒绝（corePromise 已在 getCore 内
// 复位，下次 recalc 或刷新页面自动重试），仅留一条 debug 级日志供排查。
export function warmEngine() { getCore().catch(e => console.debug('engine warmup skipped:', e)); }
