import Token from './syntax/Token';
import TokenType from './syntax/TokenType';
import { reportError } from './helpers/errors';
import Value from './syntax/ast/Value';

const keywords = {
  and: TokenType.AND,
  class: TokenType.CLASS,
  else: TokenType.ELSE,
  false: TokenType.FALSE,
  for: TokenType.FOR,
  fun: TokenType.FUN,
  if: TokenType.IF,
  nil: TokenType.NIL,
  or: TokenType.OR,
  print: TokenType.PRINT,
  return: TokenType.RETURN,
  super: TokenType.SUPER,
  this: TokenType.THIS,
  true: TokenType.TRUE,
  var: TokenType.VAR,
  while: TokenType.WHILE,
};

export class Lexer {
  private tokens: Token[] = [];
  private start = 0;
  private current = 0;
  private line = 1;

  constructor(
    private source: string,
  ) {}

  scanTokens(): Token[] {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.scanToken();
    }

    this.tokens.push(new Token(TokenType.EOF, 'end', null, this.line));

    return this.tokens;
  }

  isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private scanToken() {
    const c = this.advance();

    switch(c) {
    case '(': this.addToken(TokenType.LEFT_PAREN); break;
    case ')': this.addToken(TokenType.RIGHT_PAREN); break;
    case '{': this.addToken(TokenType.LEFT_BRACE); break;
    case '}': this.addToken(TokenType.RIGHT_BRACE); break;
    case ',': this.addToken(TokenType.COMMA); break;
    case '.': this.addToken(TokenType.DOT); break;
    case '-': this.addToken(TokenType.MINUS); break;
    case ';': this.addToken(TokenType.SEMICOLON); break;
    case '*': this.addToken(TokenType.STAR); break;
    case '+': {
      this.addToken(this.match('+') ? TokenType.PLUS_PLUS : TokenType.PLUS);
      break;
    }
    case '!': {
      this.addToken(this.match('=') ? TokenType.BANG_EQUAL : TokenType.BANG);
      break;
    }
    case '=': {
      this.addToken(this.match('=') ? TokenType.EQUAL_EQUAL : TokenType.EQUAL);
      break;
    }
    case '<': {
      this.addToken(this.match('=') ? TokenType.LESS_EQUAL : TokenType.LESS);
      break;
    }
    case '>': {
      this.addToken(this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER);
      break;
    }
    case '/': {
      if (this.match('/')) {
        while (this.peek() != '\n' && this.isAtEnd()) {
          this.advance();
        }
      } else {
        this.addToken(TokenType.SLASH);
      }
      break;
    }
    case ' ':
    case '\r':
    case '\t': break;
    case '\n': this.line++; break;
    case '"': this.string(); break;
    case '0':
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
    case '6':
    case '7':
    case '8':
    case '9': this.number(); break;
    default: {
      if (this.isDigit(c)) {
        this.number();
      } else if (this.isAlpha(c)) {
        this.identifier();
      } else {
        reportError(this.line, '', 'Unexpected character');
      }
      break;
    }
    }
  }

  private string(): void {
    while(this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === '\n') {
        this.line++;
      }

      this.advance();
    }

    if (this.isAtEnd()) {
      reportError(this.line, '', 'Unterminated string');
    }

    this.advance();

    // This is the moment to escape special characters!
    const value = this.source.slice(this.start + 1, this.current - 1);

    this.addToken(TokenType.STRING, value);
  }

  private number(): void {
    while(this.isDigit(this.peek())) {
      this.advance();
    }

    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance();

      while(this.isDigit(this.peek())) {
        this.advance();
      }
    }

    this.addToken(TokenType.NUMBER, Number(this.getLexeme()));
  }

  private identifier(): void {
    while(this.isAlphaNumeric(this.peek())) {
      this.advance();
    }

    const lexeme = this.getLexeme();
    const tokenType = keywords[lexeme] ?? TokenType.IDENTIFIER;

    this.addToken(tokenType);
  };

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  private isAlpha(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isDigit(c) || this.isAlpha(c);
  }

  private advance(): string {
    this.current++;
    return this.source.charAt(this.current - 1);
  }

  private peek(): string {
    return this.isAtEnd() ? '\0' : this.source.charAt(this.current);
  }

  private peekNext(): string {
    return this.current + 1 >= this.source.length ? '\0' : this.source.charAt(this.current + 1);
  }

  private addToken(type: TokenType, literal: Value = null) {
    const lexeme = this.getLexeme();

    this.tokens.push(new Token(type, lexeme, literal, this.line));
  }

  private match(expected: string): boolean {
    if (this.isAtEnd() || this.source.charAt(this.current) !== expected) {
      return false;
    }

    this.current++;

    return true;
  }

  private getLexeme(): string {
    return this.source.slice(this.start, this.current);
  }
}
