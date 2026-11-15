import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'crypto/index': 'src/crypto/index.ts',
    'auth/index': 'src/auth/index.ts',
    'signal/index': 'src/signal/index.ts',
    'binary/index': 'src/binary/index.ts',
    'messages/index': 'src/messages/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
})
