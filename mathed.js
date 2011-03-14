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
   * Abstract Syntax Tree Node, for representing the parsed mathed input.
   */
  function Node(type, value) {
    this.type = type;
    this.value = value;
    this.children = [];
  }

  Node.prototype.addChild = function(c) {
    this.children.push(c);
  };
  
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
      unary: /[_\^]/,
      binary: 'frac|sum|prod',
      name: /[a-zA-Z]/,
      operator: /[+\-*\/=:%!|]/,
      left_paren: /\(/,
      right_paren: /\)/,
      left_bracket: /\[/,
      right_bracket: /\]/,
      left_brace: /\{|\\\{/,
      right_brace: /\}|\\\}/
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
  
  MathedParser.prototype.lp = function(s) { this.parse( this.lex(s) ); };
  
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
    
    for (var i = 0; i < parts.length; i++)
    for (var t in this.TokenTypes) {
      if (parts[i].match(this.TokenTypes[t])) {
        tokens.push({value: parts[i], type: t});
        break;
      }
    }
      
    return tokens;
  };
  
  /**
   * Simple parser for constructing the AST.
   * @param tokens List of tokens to parse.
   * @return An abstract parse tree for the list of tokens.
   */
  MathedParser.prototype.parse = function(tokens) {
    if (!tokens || tokens.length < 1)
      return null;
      
    var root = new Node('root'), stack = [ root ], args = 0;

    function top() {
      return stack[ stack.length - 1 ];
    }

    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i], child = null;
      
      switch (t.type) {
        case 'left_paren':
        case 'left_bracket':
        case 'left_brace':
          child = new Node(t.type, t.value);
          top().addChild(child);
          stack.push(child);
          break;
        case 'right_paren':
          if (top().type != 'left_paren')
            error('Unmatched right parenthesis.');
          stack.pop();
          break;
        case 'right_bracket':
          if (top().type != 'left_bracket')
            error('Unmatched right bracket.');
          stack.pop();
          break;
        case 'right_brace':
          if (top().type != 'left_brace')
            error('Unmatched right brace.');
          stack.pop();
          break;
        case 'unary':
          child = new Node(t.type, t.value);
          top().addChild(child);
          stack.push(child);
          child.args = 1;
          break;
        case 'binary':
          child = new Node(t.type, t.value);
          top().addChild(child);
          stack.push(child);
          child.args = 2;
          break;
        default:
          top().addChild( new Node(t.type, t.value) );
          break;
      }
      
      if (isset(top().args)) {
        top().args--;
        if (top().args < 0)
          stack.pop();
      }
    }
    
    switch (top().type) {
      case 'unary':
      case 'binary':
        error('Invalid number of arguments for ' + top().type + ' function "' + top().value + '"');
      case 'left_paren':
        error('Unclosed left parenthesis');
      case 'left_bracket':
        error('Unclosed left bracket');
      case 'left_brace':
        error('Unclosed left brace');
    }
      
    return root;
  };
  
  /** 
   * Translates a parse tree into a string of mathematics HTML.
   * @param root Root node of the tree to translate.
   * @return Translated HTML from the parse tree.
   */
  MathedParser.prototype.translate = function(root) {
    if (!root)
      return '';
    
    var html = '', map = this.map.mapping;
    
    // Traverses the parse tree to form HTML
    function trec(n) {
      var h1 = '', h2 = '';
      
      switch (n.type) {
        // Atoms
        case 'special':
        case 'number':    return n.value;
        case 'map':       return map[n.value];
        case 'direct':    return ['&', n.value, ';'].join('');
        case 'name':      return ['<em>', n.value, '</em>'].join('');
        case 'operator':  return ' ' + n.value + ' ';
        
        // Parentheticals
        case 'left_paren':
          for (var k = 0; k < n.children.length; k++)
            h1 += trec( n.children[k] );
          return ['(', h1, ')'].join('');
        
        case 'left_bracket':
          for (var k = 0; k < n.children.length; k++)
            h1 += trec( n.children[k] );
          return ['[', h1, ']'].join('');
          
        case 'left_brace':
          for (var k = 0; k < n.children.length; k++)
            h1 += trec( n.children[k] );
          
          if (n.value == '\\{')
            return ['{', h1, '}'].join('');
          return h1;
      
        // Single argument functions
        case 'unary':
          h1 = trec( n.children[0] );
          if (n.value == '^')
            return ['<sup>', h1, '</sup>'].join('');
          else if (n.value == '_')
            return ['<sub>', h1, '</sub>'].join('');
        
        // Binary functions
        case 'binary':
          h1 = trec( n.children[0] );
          h2 = trec( n.children[1] );
          
          if (n.value == 'frac')
            return ['<div class="ou"><div>', h1, '</div><hr><div>', h2, '</div></div>'].join('');
          else if (n.value == "sum" || n.value == "prod") {
            return [
              '<div class="ou"><div class="small">', 
                h2, 
              '</div><div class="m bigger">', 
                '&', t.value, ';', 
              '</div><div class="small">', 
                h1, 
              '</div></div>'
            ].join('');
          }
      }      
    }
    
    // Translate to HTML
    for (var i = 0; i < root.children.length; i++)
      html += trec(root.children[i]);
    
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

// TODO Remove me!
p = Mathed.all();