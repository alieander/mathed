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
      special = ['\\(', '\\)'],
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
      name: /[a-zA-Z]/,
      operator: /[+\-*\/=:%!]/,
      sub: /_/,
      sup: /\^/,
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
      
    this.lexExp = new RegExp(patterns.join('|'), 'g');
    
    // Set the map for use later in translation
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
    var stack = [[]], 
      top = function() { return stack[stack.length-1]; };
      
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i], prev = (i > 0 ? tokens[i-1] : null);
      if (t.value == '{')
        stack.push([]);
      else if (t.value == '}') {
        var last = stack.pop();
        if (top())
          top().push(last);
      }
      else if (top())
        top().push(t);
    }
    return stack.pop();
  };
  
  /** 
   * Translates a parse tree into a string of mathematics HTML.
   * @param tree Tree to translate.
   * @return Translated HTML from the parse tree.
   */
  MathedParser.prototype.translate = function(tree) {
    var html = '', wrap = function(s, tag) { return ['<', tag, '>', s, '</', tag, '>'].join(''); };
    if (tree) {
      for (var i = 0; i < tree.length; i++) {
        var t = tree[i];
        if (typeof t == "undefined")
          continue;
        switch((typeof t.length != "undefined") ? 'array' : t.type) {
          case 'special':
          case 'left_brace':
          case 'right_brace':
          case 'number':    html += t.value;                              break;
          case 'map':       html += this.map.mapping[t.value];            break; 
          case 'direct':    html += ['&', t.value, ';'].join('');         break;
          case 'name':      html += wrap(t.value, 'em');                  break;
          case 'operator':  html += ' ' + t.value + ' ';                  break;
          case 'set':       html += ['{ ', this.translate([tree[++i]]), ' }'].join(''); break;
          case 'sup':       html += wrap(this.translate([tree[++i]]), 'sup');  break;
          case 'sub':       html += wrap(this.translate([tree[++i]]), 'sub');  break;
          case 'array':     html += this.translate(t);                         break;
        }
      }
    }
    return html;
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
    'all': '&#8704;'
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
