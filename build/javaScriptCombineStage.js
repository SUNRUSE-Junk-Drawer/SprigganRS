import * as uglifyJs from "uglify-js"
import Stage from "./stage"

export default class JavaScriptCombineStage extends Stage {
  constructor(parent, name, dependencies, allParsedFactory) {
    super(parent, name, dependencies)
    this.allParsedFactory = allParsedFactory
  }

  performStart() {
    const cloned = this
      .allParsedFactory()
      .map(parsed => parsed.clone(true))

    const combined = cloned[0]

    cloned
      .slice(1)
      .forEach(parsed => {
        combined.body = combined.body.concat(parsed.body)
        combined.end = parsed.end
      })

    const minified = uglifyJs.minify(combined, {
      mangle: this.oneOff()
        ? {
          toplevel: true,
          properties: true
        }
        : false,
      compress: {
        arguments: this.oneOff(),
        booleans: this.oneOff(),
        collapse_vars: this.oneOff(),
        comparisons: this.oneOff(),
        conditionals: this.oneOff(),
        dead_code: this.oneOff(),
        directives: this.oneOff(),
        drop_console: this.oneOff(),
        drop_debugger: this.oneOff(),
        evaluate: this.oneOff(),
        expression: false,
        hoist_funs: false,
        hoist_props: this.oneOff(),
        hoist_vars: false,
        if_return: this.oneOff(),
        inline: this.oneOff(),
        join_vars: this.oneOff(),
        keep_fargs: false,
        keep_fnames: false,
        keep_infinity: false,
        loops: this.oneOff(),
        negate_iife: this.oneOff(),
        passes: 3,
        properties: this.oneOff(),
        pure_funcs: null,
        pure_getters: `strict`,
        reduce_funcs: this.oneOff(),
        reduce_vars: this.oneOff(),
        sequences: this.oneOff(),
        side_effects: this.oneOff(),
        switches: this.oneOff(),
        toplevel: this.oneOff(),
        top_retain: null,
        typeofs: this.oneOff(),
        unsafe: false,
        unsafe_comps: false,
        unsafe_Function: false,
        unsafe_math: false,
        unsafe_proto: false,
        unsafe_regexp: false,
        unsafe_undefined: false,
        unused: this.oneOff(),
        warnings: false
      },
      toplevel: true,
      output: {
        ast: false,
        code: true
      }
    })

    this.handle(minified.error, () => {
      this.code = minified.code
      this.done()
    })
  }
}
