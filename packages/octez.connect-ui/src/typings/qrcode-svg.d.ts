// Local module declaration for `qrcode-svg` (the package ships no types of its
// own). Kept in-repo instead of depending on `@types/qrcode-svg` because
// rollup-plugin-typescript2 (rpt2) resolves DefinitelyTyped packages
// inconsistently across environments: the hoisted root `node_modules/@types`
// is found by `tsc` but not reliably by rpt2 during the rollup build (see
// rpt2 issue #277). This file lives under `src/typings`, which is on the
// package's `typeRoots` and `include`, so `qrcode-svg` resolves
// deterministically for tsc, rpt2 and CI alike.
declare module 'qrcode-svg' {
  namespace QRCode {
    interface Options {
      /** QR Code content — the only required option. */
      content: string
      /** White-space padding. `0` for no border. Default `4`. */
      padding?: number
      /** Width in pixels. Default `256`. */
      width?: number
      /** Height in pixels. Default `256`. */
      height?: number
      /** Module color (name or hex). Default `#000000`. */
      color?: string
      /** Background color (name or hex). Default `#ffffff`. */
      background?: string
      /** Error-correction level. Default `M`. */
      ecl?: 'L' | 'M' | 'H' | 'Q'
      /** Join adjacent modules into a single path element. */
      join?: boolean
      /** Add a predefined style block. */
      predefined?: boolean
      /** Pretty-print the SVG output. Default `true`. */
      pretty?: boolean
      /** Swap X/Y modules (mirror). */
      swap?: boolean
      /** Prepend the XML declaration to the SVG document. Default `true`. */
      xmlDeclaration?: boolean
      /** Output container element. Default `svg`. */
      container?: 'svg' | 'svg-viewbox' | 'g' | 'none'
    }
  }

  class QRCode {
    constructor(content: string | QRCode.Options)
    /** Generate the QR code as an SVG string. */
    public svg(options?: { container: 'svg' | 'svg-viewbox' | 'g' | 'none' }): string
    /** Save the QR code SVG to a file (Node only). */
    public save(file: string, callback: (error?: Error) => void): void
  }

  export = QRCode
}
