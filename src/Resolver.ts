import Stmt, {
  StmtVisitor,
  Expression,
  Fun,
  Print,
  If,
  Var,
  While,
  Block,
  Return,
  Class,
} from './syntax/ast/Stmt';
import Expr, {
  ExprVisitor,
  Literal,
  Logical,
  Unary,
  Binary,
  Call,
  Grouping,
  Variable,
  Assign,
  Getter,
  Setter,
  This,
  Super,
} from './syntax/ast/Expr';
import Interpreter from './Interpreter';
import Token from './syntax/Token';
import { printError, ResolveError } from './helpers/errors';

enum FunctionType {
  NONE = 'NONE',
  FUNCTION = 'FUNCTION',
  INITIALIZER = 'INITIALIZER',
  METHOD = 'METHOD',
}

enum ClassType {
  NONE = 'NONE',
  CLASS = 'CLASS',
  SUBCLASS = 'SUBCLASS',
}

export default class Resolver implements StmtVisitor<void>, ExprVisitor<void> {
  private scopes: Record<string, boolean>[] = [];
  public resolveError: ResolveError;
  private currentFunction: FunctionType = FunctionType.NONE;
  private currentClass: ClassType = ClassType.NONE;

  constructor(private interpreter: Interpreter) {}

  resolve(statements: Stmt[]): void {
    // this.beginScope();
    statements.forEach((statement) => this.resolveStmt(statement));
    // this.endScope();
  }

  private resolveStmt(stmt: Stmt): void {
    stmt.accept(this);
  }
  private resolveExpr(expr: Expr): void {
    expr.accept(this);
  }
  private resolveLocal(expr: Expr, name: Token) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i][name.lexeme] !== undefined) {
        this.interpreter.resolve(expr, this.scopes.length - 1 - i);
        return;
      }
    }
  }
  private resolveFunction(stmt: Fun, functionType: FunctionType): void {
    const enclosingFunction = this.currentFunction;
    this.currentFunction = functionType;

    this.beginScope();

    stmt.params.forEach((param) => {
      this.declareAndDefine(param);
    });

    this.resolve(stmt.body);
    this.endScope();

    this.currentFunction = enclosingFunction;
  }

  visitExpressionStmt(stmt: Expression): void {
    this.resolveExpr(stmt.expression);
  }
  visitFunStmt(stmt: Fun): void {
    this.declareAndDefine(stmt.name);

    this.resolveFunction(stmt, FunctionType.FUNCTION);
  }
  visitPrintStmt(stmt: Print): void {
    this.resolveExpr(stmt.expression);
  }
  visitIfStmt(stmt: If): void {
    this.resolveExpr(stmt.condition);
    this.resolveStmt(stmt.th);
    this.resolveStmt(stmt.el);
  }
  visitVarStmt(stmt: Var): void {
    this.declare(stmt.name);

    this.resolveExpr(stmt.initializer);

    this.define(stmt.name);
  }
  visitWhileStmt(stmt: While): void {
    this.resolveExpr(stmt.condition);
    this.resolveStmt(stmt.body);
  }
  visitBlockStmt(stmt: Block): void {
    this.beginScope();
    this.resolve(stmt.statements);
    this.endScope();
  }
  visitReturnStmt(stmt: Return): void {
    if (this.currentFunction === FunctionType.NONE) {
      this.error(stmt.keyword, 'Can not return from top-level code.');
    }

    if (!stmt.empty && this.currentFunction === FunctionType.INITIALIZER) {
      this.error(stmt.keyword, 'Can not return a value from an initializer.');
    }

    this.resolveExpr(stmt.value);
  }
  visitClassStmt(stmt: Class): void {
    const enclosingClass = this.currentClass;
    this.currentClass = ClassType.CLASS;
    this.declareAndDefine(stmt.name);

    if (stmt.superClass) {
      this.currentClass = ClassType.SUBCLASS;
      if (stmt.superClass.name.lexeme === stmt.name.lexeme) {
        this.error(
          stmt.superClass.name,
          'A class can not inherit from itself.',
        );
      }

      this.resolveExpr(stmt.superClass);

      this.beginScope();
      this.peekScope()['super'] = true;
    }

    this.beginScope();
    this.peekScope().this = true;

    stmt.methods.forEach((method) => {
      this.resolveFunction(
        method,
        method.name.lexeme === 'init'
          ? FunctionType.INITIALIZER
          : FunctionType.METHOD,
      );
    });

    this.endScope();

    if (stmt.superClass) {
      this.endScope();
    }

    this.currentClass = enclosingClass;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  visitLiteralExpr(_expr: Literal): void {
    return;
  }
  visitLogicalExpr(expr: Logical): void {
    this.resolveExpr(expr.left);
    this.resolveExpr(expr.right);
  }
  visitUnaryExpr(expr: Unary): void {
    this.resolveExpr(expr.expr);
  }
  visitBinaryExpr(expr: Binary): void {
    this.resolveExpr(expr.left);
    this.resolveExpr(expr.right);
  }
  visitCallExpr(expr: Call): void {
    this.resolveExpr(expr.callee);

    expr.args.forEach((arg) => {
      this.resolveExpr(arg);
    });
  }
  visitGroupingExpr(expr: Grouping): void {
    this.resolveExpr(expr.expr);
  }
  visitVariableExpr(expr: Variable): void {
    if (!this.emptyScopes() && this.peekScope()[expr.name.lexeme] === false) {
      this.error(
        expr.name,
        'Can not read local variable in its own initializer',
      );
    }

    this.resolveLocal(expr, expr.name);
  }
  visitAssignExpr(expr: Assign): void {
    this.resolveExpr(expr.expr);
    this.resolveLocal(expr, expr.name);
  }
  visitGetterExpr(expr: Getter): void {
    this.resolveExpr(expr.object);
  }
  visitSetterExpr(expr: Setter): void {
    this.resolveExpr(expr.object);
    this.resolveExpr(expr.expr);
  }
  visitThisExpr(expr: This): void {
    if (this.currentClass === ClassType.NONE) {
      this.error(
        expr.keyword,
        'Invalid use of keyword "this" outside of a class.',
      );
    }
    this.resolveLocal(expr, expr.keyword);
  }
  visitSuperExpr(expr: Super): void {
    if (this.currentClass === ClassType.NONE) {
      this.error(expr.keyword, 'Can not use "super" outside a class method.');
    }
    if (this.currentClass !== ClassType.SUBCLASS) {
      this.error(
        expr.keyword,
        'Can not use "super" in a class with no super class.',
      );
    }
    this.resolveLocal(expr, expr.keyword);
  }

  private beginScope(): void {
    this.scopes.push({});
  }
  private endScope(): void {
    this.scopes.pop();
  }
  private declareAndDefine(name: Token): void {
    this.declare(name);
    this.define(name);
  }
  private declare(name: Token): void {
    if (this.emptyScopes()) {
      return;
    }

    const scope = this.peekScope();
    if (scope[name.lexeme] !== undefined) {
      this.error(
        name,
        `Variable with name ${name.lexeme} already declared in this scope.`,
      );
    }

    scope[name.lexeme] = false;
  }
  private define(name: Token): void {
    if (this.emptyScopes()) {
      return;
    }

    const scope = this.peekScope();

    scope[name.lexeme] = true;
  }

  private peekScope(): Record<string, boolean> {
    return this.scopes[this.scopes.length - 1];
  }
  private emptyScopes(): boolean {
    return this.scopes.length === 0;
  }

  private error(token: Token, message: string): ResolveError {
    printError(token, message);

    this.resolveError = new ResolveError(message);

    return this.resolveError;
  }
}
