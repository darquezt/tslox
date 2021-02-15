import Token from './syntax/Token';
import Expr, {
  Binary,
  Unary,
  Literal,
  Grouping,
  Variable,
  Assign,
  Logical,
  Call,
  Getter,
  Setter,
  This,
  Super,
} from './syntax/ast/Expr';
import TokenType from './syntax/TokenType';
import { ParseError, printError } from './helpers/errors';
import Stmt, {
  Print,
  Expression,
  Var,
  Block,
  If,
  While,
  Fun,
  Return,
  Class,
} from './syntax/ast/Stmt';

type FunKind = 'function' | 'method';
const MAX_ARGS = 255;

export default class Parser {
  private current = 0;
  public parseError: ParseError = null;

  constructor(private tokens: Token[]) {}

  parse(): Stmt[] {
    const statements = [];

    while (!this.isAtEnd()) {
      statements.push(this.declaration());
    }

    return statements;
  }

  declaration(): Stmt {
    try {
      if (this.match(TokenType.CLASS)) {
        return this.classDeclaration();
      }
      if (this.match(TokenType.FUN)) {
        return this.funDeclaration('function');
      }
      if (this.match(TokenType.VAR)) {
        return this.varDeclaration();
      }

      return this.statement();
    } catch (error) {
      if (error instanceof ParseError) {
        this.synchonize();
        return null;
      }

      throw error;
    }
  }

  private classDeclaration(): Stmt {
    const name = this.consume(
      TokenType.IDENTIFIER,
      'Expected class name after keyword "class".',
    );

    let superClass = null;
    if (this.match(TokenType.LESS)) {
      this.consume(TokenType.IDENTIFIER, 'Expected super class name after <.');
      superClass = new Variable(this.previous());
    } else {
      superClass = new Variable(new Token(TokenType.IDENTIFIER, 'Object', null, null));
    }

    this.consume(TokenType.LEFT_BRACE, 'Expected { before class body.');

    const methods = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      methods.push(this.funDeclaration('method'));
    }

    this.consume(TokenType.RIGHT_BRACE, 'Expected } after class body.');

    return new Class(name, superClass, methods);
  }

  /** In jlox this function was named simply `function` */
  funDeclaration(kind: FunKind): Stmt {
    const name = this.consume(TokenType.IDENTIFIER, `Expected ${kind} name.`);
    this.consume(TokenType.LEFT_PAREN, `Expected ( after ${kind} name.`);

    const params: Token[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (params.length >= MAX_ARGS) {
          this.error(
            this.peek(),
            `Functions can not have more than ${MAX_ARGS} parameters.`,
          );
        }

        params.push(
          this.consume(TokenType.IDENTIFIER, 'Expected parameter name.'),
        );
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_PAREN, `Expected ) after ${kind} parameters.`);

    this.consume(TokenType.LEFT_BRACE, `Expected { before ${kind} body.`);
    const body = this.block();

    return new Fun(name, params, body);
  }

  private varDeclaration(): Stmt {
    const name = this.consume(TokenType.IDENTIFIER, 'Expected variable name.');

    const initializer = this.match(TokenType.EQUAL)
      ? this.expression()
      : new Literal(null);

    this.consume(TokenType.SEMICOLON, 'Expected ; after variable declaration');

    return new Var(name, initializer);
  }

  private whileStatement(): Stmt {
    this.consume(TokenType.LEFT_PAREN, 'Expected ( after while keyword.');
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, 'Expected ) after condition.');

    const body = this.statement();

    return new While(condition, body);
  }

  private statement(): Stmt {
    if (this.match(TokenType.IF)) {
      return this.ifStatement();
    }
    if (this.match(TokenType.PRINT)) {
      return this.printStatement();
    }
    if (this.match(TokenType.RETURN)) {
      return this.returnStatement();
    }
    if (this.match(TokenType.WHILE)) {
      return this.whileStatement();
    }
    if (this.match(TokenType.FOR)) {
      return this.forStatement();
    }
    if (this.match(TokenType.LEFT_BRACE)) {
      return new Block(this.block());
    }

    return this.expressionStatement();
  }

  private returnStatement(): Stmt {
    const keyword = this.previous();
    const [ value, empty ] = !this.check(TokenType.SEMICOLON)
      ? [ this.expression(), false ]
      : [ new Literal(null), true ];

    this.consume(TokenType.SEMICOLON, 'Expected ; after return value.');

    return new Return(keyword, value, empty);
  }

  private forStatement(): Stmt {
    this.consume(TokenType.LEFT_PAREN, 'Expeted ( after for keyword.');

    let initializer: Stmt;
    if (this.match(TokenType.SEMICOLON)) {
      initializer = new Block([]);
    } else if (this.match(TokenType.VAR)) {
      initializer = this.varDeclaration();
    } else {
      initializer = this.expressionStatement();
    }

    const condition = !this.check(TokenType.SEMICOLON)
      ? this.expression()
      : new Literal(true);

    this.consume(TokenType.SEMICOLON, 'Expected ; after condition.');

    const increment = !this.check(TokenType.RIGHT_PAREN)
      ? this.expression()
      : new Literal(null);

    this.consume(TokenType.RIGHT_PAREN, 'Expected ) after for clauses.');

    const body = this.statement();

    return new Block([
      initializer,
      new While(condition, new Block([body, new Expression(increment)])),
    ]);
  }

  private ifStatement(): Stmt {
    this.consume(TokenType.LEFT_PAREN, 'Expeted ( after if keyword.');
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, 'Expeted ) after condition.');

    const th = this.statement();
    const el = this.match(TokenType.ELSE) ? this.statement() : new Block([]);

    return new If(condition, th, el);
  }

  private block(): Stmt[] {
    const statements: Stmt[] = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      statements.push(this.declaration());
    }

    this.consume(TokenType.RIGHT_BRACE, 'Expected } after block.');

    return statements;
  }

  private expressionStatement(): Stmt {
    const value = this.expression();

    this.consume(TokenType.SEMICOLON, 'Expected ; after value');

    return new Expression(value);
  }

  private printStatement(): Stmt {
    const value = this.expression();

    this.consume(TokenType.SEMICOLON, 'Expected ; after value');

    return new Print(value);
  }

  private expression(): Expr {
    return this.assignment();
  }

  private assignment(): Expr {
    const expr = this.or();

    if (this.match(TokenType.EQUAL)) {
      const equals = this.previous();
      const value = this.assignment();

      if (expr instanceof Variable) {
        return new Assign(expr.name, value);
      } else if (expr instanceof Getter) {
        return new Setter(expr.object, expr.name, value);
      }

      this.error(equals, 'Invalid assignment target.');
    }

    return expr;
  }

  private or(): Expr {
    let expr = this.and();

    while (this.match(TokenType.OR)) {
      const operator = this.previous();
      const right = this.and();
      expr = new Logical(operator, expr, right);
    }

    return expr;
  }

  private and(): Expr {
    let expr = this.equality();

    while (this.match(TokenType.AND)) {
      const operator = this.previous();
      const right = this.equality();
      expr = new Logical(operator, expr, right);
    }

    return expr;
  }

  private equality(): Expr {
    let expr = this.comparison();

    while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
      const operator = this.previous();
      const right = this.comparison();
      expr = new Binary(operator, expr, right);
    }

    return expr;
  }

  private comparison(): Expr {
    let expr = this.term();

    while (
      this.match(
        TokenType.GREATER,
        TokenType.GREATER_EQUAL,
        TokenType.LESS,
        TokenType.LESS_EQUAL,
      )
    ) {
      const operator = this.previous();
      const right = this.term();
      expr = new Binary(operator, expr, right);
    }

    return expr;
  }

  private term(): Expr {
    let expr = this.factor();

    while (this.match(TokenType.MINUS, TokenType.PLUS, TokenType.PLUS_PLUS)) {
      const operator = this.previous();
      const right = this.factor();
      expr = new Binary(operator, expr, right);
    }

    return expr;
  }

  private factor(): Expr {
    let expr = this.unary();

    while (this.match(TokenType.SLASH, TokenType.STAR)) {
      const operator = this.previous();
      const right = this.unary();
      expr = new Binary(operator, expr, right);
    }

    return expr;
  }

  private unary(): Expr {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.unary();
      return new Unary(operator, right);
    }

    return this.call();
  }

  private call(): Expr {
    let expr = this.primary();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (this.match(TokenType.LEFT_PAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.DOT)) {
        const name = this.consume(TokenType.IDENTIFIER, 'Expected identifier after ".".');

        expr = new Getter(expr, name);
      } else {
        break;
      }
    }

    return expr;
  }

  private finishCall(expr: Expr): Expr {
    const args: Expr[] = [];

    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (args.length >= MAX_ARGS) {
          this.error(
            this.peek(),
            `Functions can not have more than ${MAX_ARGS} arguments.`,
          );
        }

        args.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }

    const paren = this.consume(
      TokenType.RIGHT_PAREN,
      'Expected ) after function call.',
    );

    return new Call(expr, args, paren);
  }

  private primary(): Expr {
    if (this.match(TokenType.FALSE)) {
      return new Literal(false);
    } else if (this.match(TokenType.TRUE)) {
      return new Literal(true);
    } else if (this.match(TokenType.NIL)) {
      return new Literal(null);
    } else if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      return new Literal(this.previous().literal);
    } else if (this.match(TokenType.SUPER)) {
      const keyword = this.previous();
      this.consume(TokenType.DOT, 'Expected . after keyword super.');
      const method = this.consume(TokenType.IDENTIFIER, 'Expected superclass method name.');

      return new Super(keyword, method);
    } else if (this.match(TokenType.THIS)) {
      return new This(this.previous());
    } else if (this.match(TokenType.IDENTIFIER)) {
      return new Variable(this.previous());
    } else if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, 'Expected ")" after expression.');

      return new Grouping(expr);
    }

    throw this.error(this.peek(), 'Unexpected token');
  }

  private consume(type: TokenType, message: string) {
    if (this.check(type)) {
      return this.advance();
    }

    throw this.error(this.peek(), message);
  }

  private error(token: Token, message: string): ParseError {
    printError(token, message);

    this.parseError = new ParseError(message);

    return this.parseError;
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private synchonize(): void {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) {
        return;
      }

      switch (this.peek().type) {
        case TokenType.CLASS:
        case TokenType.FUN:
        case TokenType.VAR:
        case TokenType.FOR:
        case TokenType.IF:
        case TokenType.WHILE:
        case TokenType.PRINT:
        case TokenType.RETURN:
          return;
      }

      this.advance();
    }
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) {
      return false;
    }

    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }

    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }
}
