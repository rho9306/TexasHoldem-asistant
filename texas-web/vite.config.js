import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: { port: 5173 },
  assetsInclude: ['**/*.wasm'], // 批次17：wasm 以 ?inline 内联进主包（需资产管线支持）
});
