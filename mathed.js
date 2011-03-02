/**
 * mathed.js
 * By Ryan Sandor Richards
 */
var Mathed = (function() {
  // Names that can be directly translated into HTML escape codes
  var DIRECT = [
  	'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota',
  	'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau',
  	'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega', 'alpha', 'beta', 'gamma', 'delta',
  	'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi',
  	'omicron',	'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega'
  ];

  // Non emphasised names
  var SPECIAL = [
  	'mod', 'abs', 'exp', 'sqrt', 'ln', 'lg', 'log',	'sin', 'cos', 'tan', 'cot', 
  	'sec', 'cosec', 'arcsin', 'arccos', 'arctan', 'arccot', 'sinh', 'cosh', 'tanh',
  	'coth', 'arsinh', 'arcosh', 'artanh', 'arcoth', 'rnd', 'rand', 'Si', 'Ci', 'Ei',
  	'li', 'gamma', 'min', 'max', 'gcd', 'lcm'
  ];
  
  // Lexer
  var TokenTypes = {
    direct: new RegExp(DIRECT.join('|')),
    number: /[0-9]+(\.[0-9]+)?/,
    special: new RegExp(SPECIAL.join('|')),
    name: /[a-zA-Z]/,
    operator: /[+\-*\/()=:%!|]/,
    sub: /_/,
    sup: /\^/,
    left_brace: /\{/,
    right_brace: /\}/
  };
  
  var patterns = [];
  for (var k in TokenTypes)
    patterns.push(TokenTypes[k].toString().replace(/^\//,'(').replace(/\/$/,')'));
  var lexp = new RegExp(patterns.join('|'), 'g');
  
  function lexer(s) {
    var tokens = [], parts = s.match(lexp);
    if (parts == null)
      return [];
    for (var i = 0; i < parts.length; i++)
      for (var t in TokenTypes)
        if (parts[i].match(TokenTypes[t])) {
          tokens.push({value: parts[i], type: t});
          break;
        }
    return tokens;
  }
  
  // Parser
  function parse(tokens) {
    var stack = [[]], top = function() { return stack[stack.length-1]; };
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t.value == '{')
        stack.push([]);
      else if (t.value == '}') {
        var last = stack.pop();
        top().push(last);
      }
      else
        top().push(t);
    }
    return stack.pop();
  }
  
  // Translator
  function translate(tree) {
    var html = '', wrap = function(s, tag) { return ['<', tag, '>', s, '</', tag, '>'].join(''); };
    for (var i = 0; i < tree.length; i++) {
      var t = tree[i];
      if (typeof t == "undefined")
        return;
      switch((typeof t.length != "undefined") ? 'array' : t.type) {
        case 'special':   html += t.value;                              break;
        case 'number':    html += t.value;                              break;
        case 'direct':    html += ['&', t.value, ';'].join('');         break;
        case 'name':      html += wrap(t.value, 'em');                  break;
        case 'operator':  html += ' ' + t.value + ' ';                  break;
        case 'sup':       html += wrap(translate([tree[++i]]), 'sup');  break;
        case 'sub':       html += wrap(translate([tree[++i]]), 'sub');  break;
        case 'array':     html += translate(t);                         break;
      }
    }
    return html;
  }
  
  // Public interface
  return { convert: function(s) { return translate(parse(lexer(s))); } };
})();