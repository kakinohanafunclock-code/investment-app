import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // node:sqlite は新しい組み込みモジュールで Vite の builtin 一覧に無いため
    // バンドル対象から外し、Node に委ねる。
    server: {
      deps: {
        external: ['node:sqlite'],
      },
    },
  },
});
