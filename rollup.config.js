import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';

export default [
  // Main bundle (UMD + ESM)
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/zxgeneration.umd.js',
        format: 'umd',
        name: 'ZXGeneration',
        sourcemap: true,
      },
      {
        file: 'dist/zxgeneration.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [
      resolve(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
      }),
      terser(),
    ],
  },
  // Audio Worklet (separate bundle, no minification for debugging)
  {
    input: 'src/audio-worklet.js',
    output: {
      file: 'dist/audio-worklet.js',
      format: 'iife',
      sourcemap: true,
    },
    plugins: [resolve()],
  },
];
