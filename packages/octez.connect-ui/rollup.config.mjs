import { string } from 'rollup-plugin-string'
import postcss from 'rollup-plugin-postcss'
import typescript from 'rollup-plugin-typescript2'
import babel from '@rollup/plugin-babel'
import terser from '@rollup/plugin-terser'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import postcssImport from 'postcss-import'

const extensions = ['.js', '.jsx', '.ts', '.tsx']
const nodeModuleWarningMatcher = /node_modules[\\/](ox|detect-browser|@stablelib)/

const handleRollupWarnings = (warning, warn) => {
  const id = warning.id ?? ''
  const code = warning.code ?? ''
  const message = warning.message ?? ''

  // Ignore noisy third-party warnings that do not affect emitted artifacts.
  if (nodeModuleWarningMatcher.test(id) && (code === 'INVALID_ANNOTATION' || code === 'THIS_IS_UNDEFINED')) {
    return
  }

  if (code === 'CIRCULAR_DEPENDENCY' && nodeModuleWarningMatcher.test(message)) {
    return
  }

  if (code === 'MISSING_NODE_BUILTINS' && nodeModuleWarningMatcher.test(id) && message.includes('"crypto"')) {
    return
  }

  warn(warning)
}

export default [
  {
    input: 'src/index.ts',
    onwarn: handleRollupWarnings,
    output: {
      file: 'dist/bundle.js',
      format: 'iife',
      name: 'MyApp',
      sourcemap: true
    },
    plugins: [
      resolve({ extensions }),
      commonjs(),
      postcss({
        inject: true,
        minimize: true,
        sourceMap: true
      }),
      typescript({
        tsconfig: 'tsconfig.json',
        tsconfigOverride: {
          include: ['src/**/*'],
          exclude: ['**/__tests__/**', '**/*.test.ts', '**/*.spec.ts']
        }
      }),
      babel({
        extensions,
        babelHelpers: 'bundled',
        compact: false,
        include: ['src/**/*'],
        presets: [['@babel/preset-react', { runtime: 'automatic' }]]
      }),
      terser(),
      json()
    ]
  },
  {
    input: 'src/index.ts',
    onwarn: handleRollupWarnings,
    output: [
      {
        file: 'dist/cjs/index.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/esm/index.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    plugins: [
      resolve({ extensions }),
      commonjs(),
      // Add the string plugin to import CSS files as raw text
      string({
        include: './ui/**/aggregated.css'
      }),
      postcss({
        plugins: [postcssImport()],
        inject: false,
        minimize: true,
        sourceMap: true
      }),
      typescript({
        tsconfig: 'tsconfig.json',
        tsconfigOverride: {
          include: ['src/**/*'],
          exclude: ['**/__tests__/**', '**/*.test.ts', '**/*.spec.ts']
        }
      }),
      babel({
        extensions,
        babelHelpers: 'bundled',
        compact: false,
        include: ['src/**/*'],
        presets: [['@babel/preset-react', { runtime: 'automatic' }]]
      }),
      terser(),
      json()
    ]
  }
]
