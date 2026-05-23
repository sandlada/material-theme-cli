import { defineConfig } from 'rolldown';

export default defineConfig({
    input: 'src/main.ts',
    external: ['commander'],
    output: {
        dir: './dist',
        entryFileNames: 'index.js',
        format: 'esm',
    },
    minify: false,
    sourcemap: true,
    platform: 'node'
});
