'use strict';

// prettier-ignore
var restrictedGlobals = ['addEventListener', 'blur', 'close', 'closed', 'confirm', 'defaultStatus', 'defaultstatus', 'event', 'external', 'find', 'focus', 'frameElement', 'frames', 'history', 'innerHeight', 'innerWidth', 'length', 'location', 'locationbar', 'menubar', 'moveBy', 'moveTo', 'name', 'onblur', 'onerror', 'onfocus', 'onload', 'onresize', 'onunload', 'open', 'opener', 'opera', 'outerHeight', 'outerWidth', 'pageXOffset', 'pageYOffset', 'parent', 'print', 'removeEventListener', 'resizeBy', 'resizeTo', 'screen', 'screenLeft', 'screenTop', 'screenX', 'screenY', 'scroll', 'scrollbars', 'scrollBy', 'scrollTo', 'scrollX', 'scrollY', 'self', 'status', 'statusbar', 'stop', 'toolbar', 'top' ];

module.exports = {
  root: true,

  // parser: 'babel-eslint',

  plugins: [],

  globals: {
    d3: true,
  },

  env: {
    browser: true,
    commonjs: true,
    es6: true,
    jest: true,
    node: true,
  },

  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
      generators: true,
      experimentalObjectRestSpread: true,
    },
  },

  rules: {
    // http://eslint.org/docs/rules/
    'array-callback-return': 'warn',
    'default-case': ['warn', { commentPattern: '^no default$' }],
    'dot-location': ['warn', 'property'],
    eqeqeq: ['warn', 'allow-null'],
    'new-parens': 'warn',
    'no-array-constructor': 'warn',
    'no-caller': 'warn',
    'no-cond-assign': ['warn', 'except-parens'],
    'no-const-assign': 'warn',
    'no-control-regex': 'warn',
    'no-delete-var': 'warn',
    'no-dupe-args': 'warn',
    'no-dupe-class-members': 'warn',
    'no-dupe-keys': 'warn',
    'no-duplicate-case': 'warn',
    'no-empty-character-class': 'warn',
    'no-empty-pattern': 'warn',
    'no-eval': 'warn',
    'no-ex-assign': 'warn',
    'no-extend-native': 'warn',
    'no-extra-bind': 'warn',
    'no-extra-label': 'warn',
    'no-fallthrough': 'warn',
    'no-func-assign': 'warn',
    'no-implied-eval': 'warn',
    'no-invalid-regexp': 'warn',
    'no-iterator': 'warn',
    'no-label-var': 'warn',
    'no-labels': ['warn', { allowLoop: true, allowSwitch: false }],
    'no-lone-blocks': 'warn',
    'no-loop-func': 'warn',
    'no-mixed-operators': [
      'warn',
      {
        groups: [
          ['&', '|', '^', '~', '<<', '>>', '>>>'],
          ['==', '!=', '===', '!==', '>', '>=', '<', '<='],
          ['&&', '||'],
          ['in', 'instanceof'] ],
        allowSamePrecedence: false,
      } ],
    'no-multi-str': 'warn',
    'no-native-reassign': 'warn',
    'no-negated-in-lhs': 'warn',
    'no-new-func': 'warn',
    'no-new-object': 'warn',
    'no-new-symbol': 'warn',
    'no-new-wrappers': 'warn',
    'no-obj-calls': 'warn',
    'no-octal': 'warn',
    'no-octal-escape': 'warn',
    'no-redeclare': 'warn',
    'no-regex-spaces': 'warn',
    'no-restricted-syntax': ['warn', 'WithStatement'],
    'no-script-url': 'warn',
    'no-self-assign': 'warn',
    'no-self-compare': 'warn',
    'no-sequences': 'warn',
    'no-shadow-restricted-names': 'warn',
    'no-sparse-arrays': 'warn',
    'no-template-curly-in-string': 'warn',
    'no-this-before-super': 'warn',
    'no-throw-literal': 'warn',
    'no-undef': 'error',
    'no-restricted-globals': ['error'].concat(restrictedGlobals),
    'no-unexpected-multiline': 'warn',
    'no-unreachable': 'warn',
    'no-unused-expressions': [
      'error',
      {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true,
      } ],
    'no-unused-labels': 'warn',
    'no-unused-vars': [
      'warn',
      {
        args: 'none',
        ignoreRestSiblings: true,
      } ],
    'no-use-before-define': [
      'warn',
      {
        functions: false,
        classes: false,
        variables: false,
      } ],
    'no-useless-computed-key': 'warn',
    'no-useless-concat': 'warn',
    'no-useless-constructor': 'warn',
    'no-useless-escape': 'warn',
    'no-useless-rename': [
      'warn',
      {
        ignoreDestructuring: false,
        ignoreImport: false,
        ignoreExport: false,
      } ],
    'no-with': 'warn',
    'no-whitespace-before-property': 'warn',
    'require-yield': 'warn',
    'rest-spread-spacing': ['warn', 'never'],
    strict: ['warn', 'never'],
    'unicode-bom': ['warn', 'never'],
    'use-isnan': 'warn',
    'valid-typeof': 'warn',

    'getter-return': 'warn',
  },
};

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlzdF8uZXNsaW50cmMuanMiLCJzb3VyY2VzIjpbIi5lc2xpbnRyYy5qcy0xNTE5OTQxNjAwNzgwIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuLy8gcHJldHRpZXItaWdub3JlXG52YXIgcmVzdHJpY3RlZEdsb2JhbHMgPSBbJ2FkZEV2ZW50TGlzdGVuZXInLCAnYmx1cicsICdjbG9zZScsICdjbG9zZWQnLCAnY29uZmlybScsICdkZWZhdWx0U3RhdHVzJywgJ2RlZmF1bHRzdGF0dXMnLCAnZXZlbnQnLCAnZXh0ZXJuYWwnLCAnZmluZCcsICdmb2N1cycsICdmcmFtZUVsZW1lbnQnLCAnZnJhbWVzJywgJ2hpc3RvcnknLCAnaW5uZXJIZWlnaHQnLCAnaW5uZXJXaWR0aCcsICdsZW5ndGgnLCAnbG9jYXRpb24nLCAnbG9jYXRpb25iYXInLCAnbWVudWJhcicsICdtb3ZlQnknLCAnbW92ZVRvJywgJ25hbWUnLCAnb25ibHVyJywgJ29uZXJyb3InLCAnb25mb2N1cycsICdvbmxvYWQnLCAnb25yZXNpemUnLCAnb251bmxvYWQnLCAnb3BlbicsICdvcGVuZXInLCAnb3BlcmEnLCAnb3V0ZXJIZWlnaHQnLCAnb3V0ZXJXaWR0aCcsICdwYWdlWE9mZnNldCcsICdwYWdlWU9mZnNldCcsICdwYXJlbnQnLCAncHJpbnQnLCAncmVtb3ZlRXZlbnRMaXN0ZW5lcicsICdyZXNpemVCeScsICdyZXNpemVUbycsICdzY3JlZW4nLCAnc2NyZWVuTGVmdCcsICdzY3JlZW5Ub3AnLCAnc2NyZWVuWCcsICdzY3JlZW5ZJywgJ3Njcm9sbCcsICdzY3JvbGxiYXJzJywgJ3Njcm9sbEJ5JywgJ3Njcm9sbFRvJywgJ3Njcm9sbFgnLCAnc2Nyb2xsWScsICdzZWxmJywgJ3N0YXR1cycsICdzdGF0dXNiYXInLCAnc3RvcCcsICd0b29sYmFyJywgJ3RvcCcsIF07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICByb290OiB0cnVlLFxuXG4gIC8vIHBhcnNlcjogJ2JhYmVsLWVzbGludCcsXG5cbiAgcGx1Z2luczogW10sXG5cbiAgZ2xvYmFsczoge1xuICAgIGQzOiB0cnVlLFxuICB9LFxuXG4gIGVudjoge1xuICAgIGJyb3dzZXI6IHRydWUsXG4gICAgY29tbW9uanM6IHRydWUsXG4gICAgZXM2OiB0cnVlLFxuICAgIGplc3Q6IHRydWUsXG4gICAgbm9kZTogdHJ1ZSxcbiAgfSxcblxuICBwYXJzZXJPcHRpb25zOiB7XG4gICAgZWNtYVZlcnNpb246IDYsXG4gICAgc291cmNlVHlwZTogJ21vZHVsZScsXG4gICAgZWNtYUZlYXR1cmVzOiB7XG4gICAgICBqc3g6IHRydWUsXG4gICAgICBnZW5lcmF0b3JzOiB0cnVlLFxuICAgICAgZXhwZXJpbWVudGFsT2JqZWN0UmVzdFNwcmVhZDogdHJ1ZSxcbiAgICB9LFxuICB9LFxuXG4gIHJ1bGVzOiB7XG4gICAgLy8gaHR0cDovL2VzbGludC5vcmcvZG9jcy9ydWxlcy9cbiAgICAnYXJyYXktY2FsbGJhY2stcmV0dXJuJzogJ3dhcm4nLFxuICAgICdkZWZhdWx0LWNhc2UnOiBbJ3dhcm4nLCB7IGNvbW1lbnRQYXR0ZXJuOiAnXm5vIGRlZmF1bHQkJyB9XSxcbiAgICAnZG90LWxvY2F0aW9uJzogWyd3YXJuJywgJ3Byb3BlcnR5J10sXG4gICAgZXFlcWVxOiBbJ3dhcm4nLCAnYWxsb3ctbnVsbCddLFxuICAgICduZXctcGFyZW5zJzogJ3dhcm4nLFxuICAgICduby1hcnJheS1jb25zdHJ1Y3Rvcic6ICd3YXJuJyxcbiAgICAnbm8tY2FsbGVyJzogJ3dhcm4nLFxuICAgICduby1jb25kLWFzc2lnbic6IFsnd2FybicsICdleGNlcHQtcGFyZW5zJ10sXG4gICAgJ25vLWNvbnN0LWFzc2lnbic6ICd3YXJuJyxcbiAgICAnbm8tY29udHJvbC1yZWdleCc6ICd3YXJuJyxcbiAgICAnbm8tZGVsZXRlLXZhcic6ICd3YXJuJyxcbiAgICAnbm8tZHVwZS1hcmdzJzogJ3dhcm4nLFxuICAgICduby1kdXBlLWNsYXNzLW1lbWJlcnMnOiAnd2FybicsXG4gICAgJ25vLWR1cGUta2V5cyc6ICd3YXJuJyxcbiAgICAnbm8tZHVwbGljYXRlLWNhc2UnOiAnd2FybicsXG4gICAgJ25vLWVtcHR5LWNoYXJhY3Rlci1jbGFzcyc6ICd3YXJuJyxcbiAgICAnbm8tZW1wdHktcGF0dGVybic6ICd3YXJuJyxcbiAgICAnbm8tZXZhbCc6ICd3YXJuJyxcbiAgICAnbm8tZXgtYXNzaWduJzogJ3dhcm4nLFxuICAgICduby1leHRlbmQtbmF0aXZlJzogJ3dhcm4nLFxuICAgICduby1leHRyYS1iaW5kJzogJ3dhcm4nLFxuICAgICduby1leHRyYS1sYWJlbCc6ICd3YXJuJyxcbiAgICAnbm8tZmFsbHRocm91Z2gnOiAnd2FybicsXG4gICAgJ25vLWZ1bmMtYXNzaWduJzogJ3dhcm4nLFxuICAgICduby1pbXBsaWVkLWV2YWwnOiAnd2FybicsXG4gICAgJ25vLWludmFsaWQtcmVnZXhwJzogJ3dhcm4nLFxuICAgICduby1pdGVyYXRvcic6ICd3YXJuJyxcbiAgICAnbm8tbGFiZWwtdmFyJzogJ3dhcm4nLFxuICAgICduby1sYWJlbHMnOiBbJ3dhcm4nLCB7IGFsbG93TG9vcDogdHJ1ZSwgYWxsb3dTd2l0Y2g6IGZhbHNlIH1dLFxuICAgICduby1sb25lLWJsb2Nrcyc6ICd3YXJuJyxcbiAgICAnbm8tbG9vcC1mdW5jJzogJ3dhcm4nLFxuICAgICduby1taXhlZC1vcGVyYXRvcnMnOiBbXG4gICAgICAnd2FybicsXG4gICAgICB7XG4gICAgICAgIGdyb3VwczogW1xuICAgICAgICAgIFsnJicsICd8JywgJ14nLCAnficsICc8PCcsICc+PicsICc+Pj4nXSxcbiAgICAgICAgICBbJz09JywgJyE9JywgJz09PScsICchPT0nLCAnPicsICc+PScsICc8JywgJzw9J10sXG4gICAgICAgICAgWycmJicsICd8fCddLFxuICAgICAgICAgIFsnaW4nLCAnaW5zdGFuY2VvZiddLFxuICAgICAgICBdLFxuICAgICAgICBhbGxvd1NhbWVQcmVjZWRlbmNlOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgXSxcbiAgICAnbm8tbXVsdGktc3RyJzogJ3dhcm4nLFxuICAgICduby1uYXRpdmUtcmVhc3NpZ24nOiAnd2FybicsXG4gICAgJ25vLW5lZ2F0ZWQtaW4tbGhzJzogJ3dhcm4nLFxuICAgICduby1uZXctZnVuYyc6ICd3YXJuJyxcbiAgICAnbm8tbmV3LW9iamVjdCc6ICd3YXJuJyxcbiAgICAnbm8tbmV3LXN5bWJvbCc6ICd3YXJuJyxcbiAgICAnbm8tbmV3LXdyYXBwZXJzJzogJ3dhcm4nLFxuICAgICduby1vYmotY2FsbHMnOiAnd2FybicsXG4gICAgJ25vLW9jdGFsJzogJ3dhcm4nLFxuICAgICduby1vY3RhbC1lc2NhcGUnOiAnd2FybicsXG4gICAgJ25vLXJlZGVjbGFyZSc6ICd3YXJuJyxcbiAgICAnbm8tcmVnZXgtc3BhY2VzJzogJ3dhcm4nLFxuICAgICduby1yZXN0cmljdGVkLXN5bnRheCc6IFsnd2FybicsICdXaXRoU3RhdGVtZW50J10sXG4gICAgJ25vLXNjcmlwdC11cmwnOiAnd2FybicsXG4gICAgJ25vLXNlbGYtYXNzaWduJzogJ3dhcm4nLFxuICAgICduby1zZWxmLWNvbXBhcmUnOiAnd2FybicsXG4gICAgJ25vLXNlcXVlbmNlcyc6ICd3YXJuJyxcbiAgICAnbm8tc2hhZG93LXJlc3RyaWN0ZWQtbmFtZXMnOiAnd2FybicsXG4gICAgJ25vLXNwYXJzZS1hcnJheXMnOiAnd2FybicsXG4gICAgJ25vLXRlbXBsYXRlLWN1cmx5LWluLXN0cmluZyc6ICd3YXJuJyxcbiAgICAnbm8tdGhpcy1iZWZvcmUtc3VwZXInOiAnd2FybicsXG4gICAgJ25vLXRocm93LWxpdGVyYWwnOiAnd2FybicsXG4gICAgJ25vLXVuZGVmJzogJ2Vycm9yJyxcbiAgICAnbm8tcmVzdHJpY3RlZC1nbG9iYWxzJzogWydlcnJvciddLmNvbmNhdChyZXN0cmljdGVkR2xvYmFscyksXG4gICAgJ25vLXVuZXhwZWN0ZWQtbXVsdGlsaW5lJzogJ3dhcm4nLFxuICAgICduby11bnJlYWNoYWJsZSc6ICd3YXJuJyxcbiAgICAnbm8tdW51c2VkLWV4cHJlc3Npb25zJzogW1xuICAgICAgJ2Vycm9yJyxcbiAgICAgIHtcbiAgICAgICAgYWxsb3dTaG9ydENpcmN1aXQ6IHRydWUsXG4gICAgICAgIGFsbG93VGVybmFyeTogdHJ1ZSxcbiAgICAgICAgYWxsb3dUYWdnZWRUZW1wbGF0ZXM6IHRydWUsXG4gICAgICB9LFxuICAgIF0sXG4gICAgJ25vLXVudXNlZC1sYWJlbHMnOiAnd2FybicsXG4gICAgJ25vLXVudXNlZC12YXJzJzogW1xuICAgICAgJ3dhcm4nLFxuICAgICAge1xuICAgICAgICBhcmdzOiAnbm9uZScsXG4gICAgICAgIGlnbm9yZVJlc3RTaWJsaW5nczogdHJ1ZSxcbiAgICAgIH0sXG4gICAgXSxcbiAgICAnbm8tdXNlLWJlZm9yZS1kZWZpbmUnOiBbXG4gICAgICAnd2FybicsXG4gICAgICB7XG4gICAgICAgIGZ1bmN0aW9uczogZmFsc2UsXG4gICAgICAgIGNsYXNzZXM6IGZhbHNlLFxuICAgICAgICB2YXJpYWJsZXM6IGZhbHNlLFxuICAgICAgfSxcbiAgICBdLFxuICAgICduby11c2VsZXNzLWNvbXB1dGVkLWtleSc6ICd3YXJuJyxcbiAgICAnbm8tdXNlbGVzcy1jb25jYXQnOiAnd2FybicsXG4gICAgJ25vLXVzZWxlc3MtY29uc3RydWN0b3InOiAnd2FybicsXG4gICAgJ25vLXVzZWxlc3MtZXNjYXBlJzogJ3dhcm4nLFxuICAgICduby11c2VsZXNzLXJlbmFtZSc6IFtcbiAgICAgICd3YXJuJyxcbiAgICAgIHtcbiAgICAgICAgaWdub3JlRGVzdHJ1Y3R1cmluZzogZmFsc2UsXG4gICAgICAgIGlnbm9yZUltcG9ydDogZmFsc2UsXG4gICAgICAgIGlnbm9yZUV4cG9ydDogZmFsc2UsXG4gICAgICB9LFxuICAgIF0sXG4gICAgJ25vLXdpdGgnOiAnd2FybicsXG4gICAgJ25vLXdoaXRlc3BhY2UtYmVmb3JlLXByb3BlcnR5JzogJ3dhcm4nLFxuICAgICdyZXF1aXJlLXlpZWxkJzogJ3dhcm4nLFxuICAgICdyZXN0LXNwcmVhZC1zcGFjaW5nJzogWyd3YXJuJywgJ25ldmVyJ10sXG4gICAgc3RyaWN0OiBbJ3dhcm4nLCAnbmV2ZXInXSxcbiAgICAndW5pY29kZS1ib20nOiBbJ3dhcm4nLCAnbmV2ZXInXSxcbiAgICAndXNlLWlzbmFuJzogJ3dhcm4nLFxuICAgICd2YWxpZC10eXBlb2YnOiAnd2FybicsXG5cbiAgICAnZ2V0dGVyLXJldHVybic6ICd3YXJuJyxcbiAgfSxcbn07XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDOzs7QUFHYixJQUFJLGlCQUFpQixHQUFHLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBRSxDQUFDLENBQUM7O0FBRS9yQixNQUFNLENBQUMsT0FBTyxHQUFHO0VBQ2YsSUFBSSxFQUFFLElBQUk7Ozs7RUFJVixPQUFPLEVBQUUsRUFBRTs7RUFFWCxPQUFPLEVBQUU7SUFDUCxFQUFFLEVBQUUsSUFBSTtHQUNUOztFQUVELEdBQUcsRUFBRTtJQUNILE9BQU8sRUFBRSxJQUFJO0lBQ2IsUUFBUSxFQUFFLElBQUk7SUFDZCxHQUFHLEVBQUUsSUFBSTtJQUNULElBQUksRUFBRSxJQUFJO0lBQ1YsSUFBSSxFQUFFLElBQUk7R0FDWDs7RUFFRCxhQUFhLEVBQUU7SUFDYixXQUFXLEVBQUUsQ0FBQztJQUNkLFVBQVUsRUFBRSxRQUFRO0lBQ3BCLFlBQVksRUFBRTtNQUNaLEdBQUcsRUFBRSxJQUFJO01BQ1QsVUFBVSxFQUFFLElBQUk7TUFDaEIsNEJBQTRCLEVBQUUsSUFBSTtLQUNuQztHQUNGOztFQUVELEtBQUssRUFBRTs7SUFFTCx1QkFBdUIsRUFBRSxNQUFNO0lBQy9CLGNBQWMsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsQ0FBQztJQUM1RCxjQUFjLEVBQUUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDO0lBQ3BDLE1BQU0sRUFBRSxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUM7SUFDOUIsWUFBWSxFQUFFLE1BQU07SUFDcEIsc0JBQXNCLEVBQUUsTUFBTTtJQUM5QixXQUFXLEVBQUUsTUFBTTtJQUNuQixnQkFBZ0IsRUFBRSxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUM7SUFDM0MsaUJBQWlCLEVBQUUsTUFBTTtJQUN6QixrQkFBa0IsRUFBRSxNQUFNO0lBQzFCLGVBQWUsRUFBRSxNQUFNO0lBQ3ZCLGNBQWMsRUFBRSxNQUFNO0lBQ3RCLHVCQUF1QixFQUFFLE1BQU07SUFDL0IsY0FBYyxFQUFFLE1BQU07SUFDdEIsbUJBQW1CLEVBQUUsTUFBTTtJQUMzQiwwQkFBMEIsRUFBRSxNQUFNO0lBQ2xDLGtCQUFrQixFQUFFLE1BQU07SUFDMUIsU0FBUyxFQUFFLE1BQU07SUFDakIsY0FBYyxFQUFFLE1BQU07SUFDdEIsa0JBQWtCLEVBQUUsTUFBTTtJQUMxQixlQUFlLEVBQUUsTUFBTTtJQUN2QixnQkFBZ0IsRUFBRSxNQUFNO0lBQ3hCLGdCQUFnQixFQUFFLE1BQU07SUFDeEIsZ0JBQWdCLEVBQUUsTUFBTTtJQUN4QixpQkFBaUIsRUFBRSxNQUFNO0lBQ3pCLG1CQUFtQixFQUFFLE1BQU07SUFDM0IsYUFBYSxFQUFFLE1BQU07SUFDckIsY0FBYyxFQUFFLE1BQU07SUFDdEIsV0FBVyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDOUQsZ0JBQWdCLEVBQUUsTUFBTTtJQUN4QixjQUFjLEVBQUUsTUFBTTtJQUN0QixvQkFBb0IsRUFBRTtNQUNwQixNQUFNO01BQ047UUFDRSxNQUFNLEVBQUU7VUFDTixDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQztVQUN2QyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUM7VUFDaEQsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO1VBQ1osQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQ3RCLENBQUM7UUFDRCxtQkFBbUIsRUFBRSxLQUFLO09BQzNCLENBQ0gsQ0FBQztJQUNELGNBQWMsRUFBRSxNQUFNO0lBQ3RCLG9CQUFvQixFQUFFLE1BQU07SUFDNUIsbUJBQW1CLEVBQUUsTUFBTTtJQUMzQixhQUFhLEVBQUUsTUFBTTtJQUNyQixlQUFlLEVBQUUsTUFBTTtJQUN2QixlQUFlLEVBQUUsTUFBTTtJQUN2QixpQkFBaUIsRUFBRSxNQUFNO0lBQ3pCLGNBQWMsRUFBRSxNQUFNO0lBQ3RCLFVBQVUsRUFBRSxNQUFNO0lBQ2xCLGlCQUFpQixFQUFFLE1BQU07SUFDekIsY0FBYyxFQUFFLE1BQU07SUFDdEIsaUJBQWlCLEVBQUUsTUFBTTtJQUN6QixzQkFBc0IsRUFBRSxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUM7SUFDakQsZUFBZSxFQUFFLE1BQU07SUFDdkIsZ0JBQWdCLEVBQUUsTUFBTTtJQUN4QixpQkFBaUIsRUFBRSxNQUFNO0lBQ3pCLGNBQWMsRUFBRSxNQUFNO0lBQ3RCLDRCQUE0QixFQUFFLE1BQU07SUFDcEMsa0JBQWtCLEVBQUUsTUFBTTtJQUMxQiw2QkFBNkIsRUFBRSxNQUFNO0lBQ3JDLHNCQUFzQixFQUFFLE1BQU07SUFDOUIsa0JBQWtCLEVBQUUsTUFBTTtJQUMxQixVQUFVLEVBQUUsT0FBTztJQUNuQix1QkFBdUIsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQztJQUM1RCx5QkFBeUIsRUFBRSxNQUFNO0lBQ2pDLGdCQUFnQixFQUFFLE1BQU07SUFDeEIsdUJBQXVCLEVBQUU7TUFDdkIsT0FBTztNQUNQO1FBQ0UsaUJBQWlCLEVBQUUsSUFBSTtRQUN2QixZQUFZLEVBQUUsSUFBSTtRQUNsQixvQkFBb0IsRUFBRSxJQUFJO09BQzNCLENBQ0gsQ0FBQztJQUNELGtCQUFrQixFQUFFLE1BQU07SUFDMUIsZ0JBQWdCLEVBQUU7TUFDaEIsTUFBTTtNQUNOO1FBQ0UsSUFBSSxFQUFFLE1BQU07UUFDWixrQkFBa0IsRUFBRSxJQUFJO09BQ3pCLENBQ0gsQ0FBQztJQUNELHNCQUFzQixFQUFFO01BQ3RCLE1BQU07TUFDTjtRQUNFLFNBQVMsRUFBRSxLQUFLO1FBQ2hCLE9BQU8sRUFBRSxLQUFLO1FBQ2QsU0FBUyxFQUFFLEtBQUs7T0FDakIsQ0FDSCxDQUFDO0lBQ0QseUJBQXlCLEVBQUUsTUFBTTtJQUNqQyxtQkFBbUIsRUFBRSxNQUFNO0lBQzNCLHdCQUF3QixFQUFFLE1BQU07SUFDaEMsbUJBQW1CLEVBQUUsTUFBTTtJQUMzQixtQkFBbUIsRUFBRTtNQUNuQixNQUFNO01BQ047UUFDRSxtQkFBbUIsRUFBRSxLQUFLO1FBQzFCLFlBQVksRUFBRSxLQUFLO1FBQ25CLFlBQVksRUFBRSxLQUFLO09BQ3BCLENBQ0gsQ0FBQztJQUNELFNBQVMsRUFBRSxNQUFNO0lBQ2pCLCtCQUErQixFQUFFLE1BQU07SUFDdkMsZUFBZSxFQUFFLE1BQU07SUFDdkIscUJBQXFCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDO0lBQ3hDLE1BQU0sRUFBRSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUM7SUFDekIsYUFBYSxFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQztJQUNoQyxXQUFXLEVBQUUsTUFBTTtJQUNuQixjQUFjLEVBQUUsTUFBTTs7SUFFdEIsZUFBZSxFQUFFLE1BQU07R0FDeEI7Q0FDRixDQUFDOyJ9