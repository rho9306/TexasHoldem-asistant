import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'happy-dom' },
  assetsInclude: ['**/*.wasm'], // 批次17：与 vite.config 同步——pokerCore.js 以 ?inline 导入 wasm
});
