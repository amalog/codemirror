CodeMirror.defineMode("amalog", function(config, parserConfig) {
  var indentUnit = 4,
      statementIndentUnit = parserConfig.statementIndentUnit || indentUnit,
      keywords = {
          about: true,
          main: true,
          is: true,
      },
      builtins = {
          load: true,
          store: true,
      },
      atoms = parserConfig.atoms || {};

  function tokenBase(stream, state) {
    var ch = stream.next();
    if (ch == '"' || ch == "`") {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    }
    if (/[\[\]{}\(\),;\:\.]/.test(ch)) {
      return null;
    }
    if (/\d/.test(ch)) {
      stream.eatWhile(/[\d\.]/);
      return "number";
    }
    if (ch == "/") {
      if (stream.eat("*")) {
        state.tokenize = tokenComment;
        return tokenComment(stream, state);
      }
      if (stream.eat("/")) {
        stream.skipToEnd();
        return "comment";
      }
    }
    stream.eatWhile(/[\w\$_]/);
    var cur = stream.current();
    if ( cur == "_" ) {
        return "anonymous-variable";
    }
    if ( /_/.test(cur[0]) ) {
      return "named-singleton";
    }
    if ( /[A-Z]/.test(cur[0])) {
      return "variable";
    }
    if (keywords[cur]) {
      return "keyword";
    }
    if (builtins[cur]) {
      return "builtin";
    }
    return "atom";
  }

  function tokenString(quote) {
    return function(stream, state) {
      var escaped = false, next, end = false;
      while ((next = stream.next()) != null) {
        if (next == quote && !escaped) {end = true; break;}
        escaped = !escaped && next == "\\";
      }
      if (end)
        state.tokenize = null;
      return "string";
    };
  }

  function tokenComment(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch == "/" && maybeEnd) {
        state.tokenize = null;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return "comment";
  }

  function Context(indented, column, type, prev) {
    this.indented = indented;
    this.column = column;
    this.type = type;
    this.prev = prev;
  }
  function pushContext(state, col, type) {
    var indent = state.indented;
    if (state.context && state.context.type == "statement")
      indent = state.context.indented;
    return state.context = new Context(indent, col, type, state.context);
  }
  function popContext(state) {
    var t = state.context.type;
    if (t == ")" || t == "]" || t == "}")
      state.indented = state.context.indented;
    return state.context = state.context.prev;
  }

  // Interface

  return {
    startState: function(basecolumn) {
      return {
        tokenize: null,
        context: new Context((basecolumn || 0) - indentUnit, 0, "top", false),
        indented: 0,
        startOfLine: true
      };
    },

    token: function(stream, state) {
      var ctx = state.context;
      if (stream.sol()) {
        state.indented = stream.indentation();
        state.startOfLine = true;
      }
      if (stream.eatSpace()) return null;
      var style = (state.tokenize || tokenBase)(stream, state);
      if (style == "comment" || style == "meta") return style;

      state.startOfLine = false;
      return style;
    },

    indent: function(state, textAfter) {
      var ctx = state.context;
      return 4;
    },

    electricChars: "{}",
    blockCommentStart: "/*",
    blockCommentEnd: "*/",
    lineComment: "//",
    fold: "brace"
  };
});

(function() {
    CodeMirror.defineMIME("text/amalog", {name: "amalog"});
}());
