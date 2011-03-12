/**
 * mathed.js
 * By Ryan Sandor Richards
 */
 
/**
 * The Mathed Library
 * @author Ryan Sandor Richards
 */
var Mathed = (function() {
  // The list of named plugins
  var plugins = {};
  
  // Various helper functions to make the code more readable
  function error(msg) {
    throw "Mathed -- " + msg;
  }
  
  function isset(a) {
    return (typeof(a) != "undefined" && a != null);
  }
  
  function escapeRegex(s) {
    var search = ['+', '\\', '[', ']', '|', '^', '$', '*', '?', '(', ')', '{', '}', '!'];
    for (var i = 0; i < search.length; i++) {
      var ch = search[i];
      s = s.replace( new RegExp('\\'+ch, 'g'), '\\'+ch);
    }
    return s;
  }
  
  /**
   * The Mathed Parser class. Instantiations of this class are used
   * to perform the actual parsing of input into symbolic HTML.
   * @param pluginNames (optional) Which plugins to use for parsing.
   * @throws Exception if a specified plugin name isn't a valid plugin.
   */
  function MathedParser(pluginNames) {
    var direct = [],
      special = [],
      map = {tokens: [], mapping: {}};
    
    // Loads a plugin with the given name
    function load(name) {
      var plugin = plugins[name], i;
      if (!plugin)
        error("Plugin with name '" + name + "' was not found.");
      
      // Add direct translation items
      if ( isset(plugin.direct) ) {
        for (i = 0; i < plugin.direct.length; i++)
          direct.push(plugin.direct[i]);
      }
      
      // Add special non-emphasised variable names (usually function names)
      if ( isset(plugin.special) ) {
        for (i = 0; i < plugin.special.length; i++)
          special.push(plugin.special[i]);
      }
      
      // Add special mappings of names to elements
      if ( isset(plugin.map) ) {
        for (i in plugin.map) {
          map.mapping[i] = plugin.map[i];
          map.tokens.push(escapeRegex(i));
        }
      }
    }
    
    // Load the required parser plugins
    if (typeof pluginNames == "undefined") {
      for (var k in plugins)
        load(k);
    }
    else {
      for (var i = 0; i < pluginNames.length; i++)
        load(pluginNames[i]);
    }
    
    // Compile the token types expressions and master lexer pattern
    this.TokenTypes = {
      map: false,
      direct: false,
      special: false,
      number: /[0-9]+(\.[0-9]+)?/,
      set: 'set',
      frac: 'frac',
      overunder: 'sum|prod',
      name: /[a-zA-Z]/,
      operator: /[+\-*\/=:%!|]/,
      sub: /_/,
      sup: /\^/,
      left_paren: /\(/,
      right_paren: /\)/,
      left_bracket: /\[/,
      right_bracket: /\]/,
      left_brace: /\{/,
      right_brace: /\}/
    };
    
    if (map.tokens.length > 0)
      this.TokenTypes.map = new RegExp(map.tokens.join('|'));
    if (direct.length > 0)
      this.TokenTypes.direct = new RegExp(direct.join('|'));
    if (special.length > 0)
      this.TokenTypes.special = new RegExp(special.join('|'));
    
    var patterns = [];
    for (var k in this.TokenTypes) {
      if (this.TokenTypes[k] !== false)
        patterns.push(this.TokenTypes[k].toString().replace(/^\//,'(').replace(/\/$/,')'));
    }
    
    // Instance variables to aid translation  
    this.lexExp = new RegExp(patterns.join('|'), 'g');
    this.map = map;
  }
  
  /** 
   * Performs lexical analysis on a given string.
   * @param s String to lex
   * @return A list of tokens with associated types.
   */
  MathedParser.prototype.lex = function(s) {
    if (typeof s == "undefined") 
      return [];
    
    var tokens = [], 
      parts = s.match(this.lexExp);
    
    if (parts == null) 
      return [];
    
    for (var i = 0; i < parts.length; i++) { 
      for (var t in this.TokenTypes) {
        if (parts[i].match(this.TokenTypes[t])) {
          if (t == 'overunder' || t == 'frac') {
            this.largeParen = true;
          }
          tokens.push({value: parts[i], type: t});
          break;
        }
      }
    }
      
    return tokens;
  };
  
  /**
   * Very simple LL(1) parsing of a token list.
   * @param tokens List of tokens to parse.
   * @return An abstract parse tree for the list of tokens.
   */
  MathedParser.prototype.parse = function(tokens) {
    var stack = [[]], last = null;
    
    function top() { 
      return stack[stack.length-1]; 
    }
    
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      switch (t.value) {
        case '{':  stack.push([]);                                    break;
        case '(':
        case '[':  top().push(t); stack.push([]);                     break;      
        case '}':
        case ']':
        case ')':  last = stack.pop(); if (top()) top().push(last);   break;
        default:   if (top()) top().push(t);                          break;
      }
    }
    
    return stack.pop();
  };
  
  /** 
   * Translates a parse tree into a string of mathematics HTML.
   * @param tree Tree to translate.
   * @return Translated HTML from the parse tree.
   */
  MathedParser.prototype.translate = function(tree) {
    if (!tree) 
      return '';
    
    var map = this.map;
    
    function wrap(s, tag) {
      return ['<', tag, '>', s, '</', tag, '>'].join('');
    }
    
    function parenWrap(inside, type, size) {
      var typeMap = {
        '(': [15, 16, 17, 18, 19, 20],
        '[': [21, 22, 23, 24, 25, 26],
        '{': [27, 28, 29, 31, 32, 33]
      };
      
      function code(i) {
        return '&#91'+typeMap[type][i]+';';
      }
      
      if (size == 0) {
        switch (type) {
          case '(':  return '(' + inside + ')';
          case '[':  return '[' + inside + ']';
          case '{':  return '{' + inside + '}';
          default:   return inside;
        }
      }
      
      var html = '<div class="ou"><div class="p">' + code(0) + '</div>';
      for (var k = 0; k < size-1; k++)
        html += '<div class="p">' + code(1) + '</div>';
      html += '<div class="p">' + code(2) + '</div></div>';
      
      html += ' ' + inside + ' ';
      
      html += '<div class="ou"><div class="p">' + code(3) + '</div>';
      for (var k = 0; k < size-1; k++)
        html += '<div class="p">' + code(4) + '</div>';
      html += '<div class="p">' + code(5) + '</div></div>';
      
      return html;
    }
    
    function translateRec(tree) {
      var html = '', 
        parenSize = 0,
        childResult;
      
      for (var i = 0; i < tree.length; i++) {
        var t = tree[i];
        if (typeof t == "undefined") continue;
        
        switch((typeof t.length != "undefined") ? 'array' : t.type) {
          
          /*
           * Parentheticals
           */
          case 'left_bracket':
          case 'left_paren':
            childResult = translateRec(tree[++i]);
            html += parenWrap(childResult.html, t.value, childResult.parenSize);
            parenSize = Math.max(parenSize, childResult.parenSize + 1);
            break;
          
          /*
           * Fractions, Products, and Sums
           */
          case 'frac':
            var numer = translateRec([tree[++i]]),
              denom = translateRec([tree[++i]]);
          
            html += [
              '<div class="ou"><div>', 
                numer.html, 
              '</div><hr><div>', 
                denom.html, 
              '</div></div>'
            ].join('');

            parenSize = Math.max(1, parenSize, numer.parenSize, denom.parenSize);
            break;
            
          case 'overunder':
            var under = translateRec([tree[++i]]),
              middle = translateRec([{value: t.value, type: 'direct'}]);
              over = translateRec([tree[++i]]);
              
            html += [
              '<div class="ou"><div class="small">', 
                over.html, 
              '</div><div class="m bigger">', 
                middle.html, 
              '</div><div class="small">', 
                under.html, 
              '</div></div>'
            ].join('');
            
            parenSize = Math.max(1, parenSize, under.parenSize, over.parenSize);
            break;
  
          /*
           * Set, Superscript, Subscript.
           */
          case 'set':
            childResult = translateRec( [tree[++i]] );
            html += parenWrap(childResult.html, '{', childResult.parenSize);
            parenSize = Math.max(1, parenSize, childResult.parenSize);
            break;
          case 'sup':
            childResult = translateRec( [tree[++i]] );
            parenSize = Math.max(parenSize, childResult.parenSize);
            html += wrap(childResult.html, 'sup');
            break;
          case 'sub':
            childResult = translateRec( [tree[++i]] );
            parenSize = Math.max(parenSize, childResult.parenSize);
            html += wrap(childResult.html, 'sub');
            break;
            
          /*
           * Arrays
           */
          case 'array':     
            childResult = translateRec(t);
            parenSize = Math.max(parenSize, childResult.parenSize);
            html += childResult.html;
            break;
            
          /*
           * The rest of the story...
           */
          case 'special':
          case 'left_brace':
          case 'right_brace':
          case 'number':    html += t.value;                              break;
          case 'map':       html += this.map.mapping[t.value];            break; 
          case 'direct':    html += ['&', t.value, ';'].join('');         break;
          case 'name':      html += wrap(t.value, 'em');                  break;
          case 'operator':  html += ' ' + t.value + ' ';                  break;
        }
      }
      
      return {
        html: html, 
        parenSize: parenSize
      };
    }
    
    return translateRec(tree).html;
  };
  
  /**
   * Converts an input string into math HTML by lexing, parsing, and then translating.
   * @param s String to convert
   * @return The math HTML conversion of the string
   */
  MathedParser.prototype.convert = function(s) {
    return this.translate( this.parse( this.lex(s) ) );
  };
  
  // Public interface
  return { 
    /**
     * Creates and returns mathed parser that uses only the specified plugins.
     * @param n1, n2, ... Names of the plugins to use for the parser instance.
     * @return The parser instance that uses only the specified plugins.
     */
    use: function() {
      return new MathedParser(arguments);
    },
    
    /**
     * Creates and returns a mathed parser that uses everything but the given
     * plugins.
     * @param n1, n2, ... Names of the plugins to exclude.
     * @return A parser instance that uses everything but the specified plugins.
     */
    not: function() {
      var pluginNames = [];
      for (var k in plugins) {
        var use = true;
        for (var i = 0; i < arguments.length; i++) {
          if (arguments[i] == k) {
            use = false;
            break;
          }
        }
        if (use)
          pluginNames.push(k);
      }
      return new MathedParser(pluginNames);
    },
    
    /** 
     * Creates a new mathed parser that uses all loaded plugins.
     */
    all: function() {
      return new MathedParser();
    },
    
    /**
     * Adds a plugin to the Mathed system.
     * @param n Name for the plugin
     * @param p Plugin object
     * return The Mathed object.
     */
    plugin: function(n, p) {
      plugins[n] = p;
      return Mathed;
    }
  };
})();

/*
 * In this section we define built-in plugins for use with the Mathed Library.
 */

// Greek Letters
Mathed.plugin('greek', {
  direct: [
    'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota',
  	'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau',
  	'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega', 'alpha', 'beta', 'gamma', 'delta',
  	'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi',
  	'omicron',	'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega'
  ]
});

// Common mathematical functions
Mathed.plugin('functions', {
  special: [
    'sin', 'cos', 'tan', 'cot', 'sec', 'cosec', 'arcsin', 'arccos', 'arctan', 
    'arccot', 'sinh', 'cosh', 'tanh', 'coth', 'arsinh', 'arcosh', 'artanh', 'arcoth',
   	'mod', 'abs', 'rnd', 'rand', 'min', 'max', 'gcd', 'lcm', 'exp', 'sqrt', 'ln', 
   	'lg', 'log'
  ]
});

// Comparisons
Mathed.plugin('comparisons', {
  map: {
    '<=': ' &le; ',
    '>=': ' &ge; ',
    '!=': ' &ne; ',
    '<': ' &lt; ',
    '>': ' &gt; '
  }
});

// Mathematical Logic
Mathed.plugin('logic', {
  direct: ['not', 'exist'],
  map: {
    '&&': ' &and; ',
    'and': ' &and; ',
    '||': ' &or; ',
    'or': ' &or; ',
    'to': ' &rarr; ',
    'from': ' &larr; ',
    'iff': ' &harr; ',
    'all': '&#8704;',
    '|-': ' &#8870; ',
    '|=': ' &#8873; '
  }
});

// Sets
Mathed.plugin('set', {
  direct: ['empty'],
  map: {
    'union': ' &#x22c3; ',
    'cup': ' &#x22c3; ',
    'intersect': ' &#x22c2; ',
    'cap': ' &#x22c2; ',
    'in': ' &#8712; ',
    'notin': ' &#8713; '
  }
});

// Blackboard Bold font symbols
Mathed.plugin('blackboard', {
  map: {
    'bbR': '&#8477;', 
    'bbC': '&#8450;', 
    'bbN': '&#8469;', 
    'bbP': '&#8473;', 
    'bbQ': '&#8474;', 
    'bbZ': '&#8484;'
  }
});

// Misc mathematical symbols
Mathed.plugin('misc', {
  direct: ['infin'],
  map: {
    '+-': ' &plusmn; ',
    "'": ' &prime;',
    ',': ', '
  }
});
