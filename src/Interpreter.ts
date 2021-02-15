import Value from './syntax/ast/Value';
import TokenType from './syntax/TokenType';
import Token from './syntax/Token';
import Expr, {
  ExprVisitor,
  Literal,
  Unary,
  Binary,
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
import Stmt, {
  StmtVisitor,
  Expression,
  Print,
  Var,
  Block,
  If,
  While,
  Fun,
  Return,
  Class,
} from './syntax/ast/Stmt';

import Environment from './runtime/Environment';
import LoxCallable from './runtime/LoxCallable';
import LoxFunction from './runtime/LoxFunction';
import ReturnException from './runtime/ReturnException';
import LoxClass from './runtime/LoxClass';

import { printValue } from './helpers/values';
import { RuntimeError } from './helpers/errors';
import LoxInstance from './runtime/LoxInstance';

export default class Interpreter
  implements ExprVisitor<Value>, StmtVisitor<Value> {
  public globals = new Environment();
  private environment = new Environment();
  private locals: WeakMap<Expr, number> = new WeakMap();

  constructor() {
    const clock: LoxCallable = {
      arity() {
        return 0;
      },

      call() {
        return Date.now() / 1000;
      },
    };
    const objectClass: LoxClass = new LoxClass('Object', null, {});

    this.globals.define('clock', clock);
    this.globals.define('Object', objectClass);
    this.environment = this.globals;
  }

  interpret(statements: Stmt[]): Value {
    const values = statements.map((stmt) => this.execute(stmt));

    return values[values.length - 1];
  }

  resolve(expr: Expr, depth: number): void {
    this.locals.set(expr, depth);
  }

  private execute(statement: Stmt): Value {
    return statement.accept(this);
  }
  executeBlock(statements: Stmt[], environment: Environment): Value {
    const previous = this.environment;

    try {
      this.environment = environment;

      const values = statements.map((statement) => this.execute(statement));

      return values[values.length - 1];
    } finally {
      this.environment = previous;
    }
  }

  private evaluate(expr: Expr): Value {
    return expr.accept(this);
  }

  /** Statements visitors */

  visitExpressionStmt(stmt: Expression): Value {
    return this.evaluate(stmt.expression);
  }
  visitPrintStmt(stmt: Print): Value {
    const value = this.evaluate(stmt.expression);

    printValue(value);

    return null;
  }
  visitVarStmt(stmt: Var): Value {
    const value = this.evaluate(stmt.initializer);

    this.environment.define(stmt.name.lexeme, value);

    return value;
  }
  visitBlockStmt(stmt: Block): Value {
    return this.executeBlock(
      stmt.statements,
      new Environment(this.environment),
    );
  }
  visitIfStmt(stmt: If): Value {
    if (this.isTruthy(this.evaluate(stmt.condition))) {
      return this.execute(stmt.th);
    }

    return this.execute(stmt.el);
  }
  visitWhileStmt(stmt: While): Value {
    while (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.body);
    }

    return null;
  }
  visitFunStmt(stmt: Fun): Value {
    const fun = new LoxFunction(stmt, this.environment);

    this.environment.define(stmt.name.lexeme, fun);

    return fun;
  }
  visitReturnStmt(stmt: Return): Value {
    const value = this.evaluate(stmt.value);

    throw new ReturnException(value);
  }
  visitClassStmt(stmt: Class): Value {
    const superClass = stmt.superClass ? this.evaluate(stmt.superClass) : null;

    if (superClass && !(superClass instanceof LoxClass)) {
      throw new RuntimeError(
        stmt.superClass.name,
        'Super class must be a class.',
      );
    }

    this.environment.define(stmt.name.lexeme, null);

    if (stmt.superClass) {
      this.environment = new Environment(this.environment);
      this.environment.define('super', superClass);
    }

    const methods: Record<string, LoxFunction> = stmt.methods.reduce(
      (acc, method) => ({
        ...acc,
        [method.name.lexeme]: new LoxFunction(
          method,
          this.environment,
          method.name.lexeme === 'init',
        ),
      }),
      {},
    );

    const loxClass = new LoxClass(
      stmt.name.lexeme,
      superClass as LoxClass,
      methods,
    );

    if (superClass) {
      this.environment = this.environment.enclosing;
    }

    this.environment.assign(stmt.name, loxClass);

    return null;
  }

  /** Expressions visitors */

  visitSuperExpr(expr: Super): Value {
    const distance = this.locals.get(expr);
    const superClass = this.environment.getAt(distance, 'super') as LoxClass;

    const object = this.environment.getAt(distance - 1, 'this') as LoxInstance;

    const method = superClass.findMethod(expr.method.lexeme);

    if (!method) {
      throw new RuntimeError(
        expr.method,
        `Undefined method ${expr.method.lexeme}.`,
      );
    }

    return method.bindInstance(object);
  }
  visitThisExpr(expr: This): Value {
    return this.lookupVariable(expr.keyword, expr);
  }
  visitGetterExpr(expr: Getter): Value {
    const object = this.evaluate(expr.object);

    if (object instanceof LoxInstance) {
      return object.get(expr.name);
    }

    throw new RuntimeError(
      expr.name,
      'Can not access property from a non-instance value.',
    );
  }
  visitSetterExpr(expr: Setter): Value {
    const object = this.evaluate(expr.object);

    if (!(object instanceof LoxInstance)) {
      throw new RuntimeError(expr.name, 'Only objects have fields');
    }

    const value = this.evaluate(expr.expr);

    object.set(expr.name, value);

    return value;
  }
  visitCallExpr(expr: Call): Value {
    const callee = this.evaluate(expr.callee);

    const args = expr.args.map((arg) => this.evaluate(arg));

    if (!(callee as LoxCallable).call) {
      throw new RuntimeError(
        expr.paren,
        'Only functions and classes are callable.',
      );
    }

    // TODO: Remove unknown
    const fun = callee as LoxCallable;

    if (args.length !== fun.arity()) {
      throw new RuntimeError(
        expr.paren,
        `Expected ${fun.arity()} arguments but got ${args.length}.`,
      );
    }

    return fun.call(this, args);
  }
  visitLiteralExpr(expr: Literal): Value {
    return expr.value;
  }
  visitUnaryExpr(expr: Unary): Value {
    const val = this.evaluate(expr.expr);

    switch (expr.operator.type) {
      case TokenType.MINUS:
        return -val;
      case TokenType.BANG:
        return !this.isTruthy(val);
      default:
        throw new Error('PANIK: You should have never reached here!');
    }
  }
  visitBinaryExpr(expr: Binary): Value {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.MINUS: {
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) - (right as number);
      }
      case TokenType.SLASH: {
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) / (right as number);
      }
      case TokenType.STAR: {
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) * (right as number);
      }
      case TokenType.PLUS: {
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) + (right as number);
      }
      case TokenType.PLUS_PLUS: {
        this.checkStringOperands(expr.operator, left, right);
        return (left as string) + (right as string);
      }
      case TokenType.LESS: {
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) < (right as number);
      }
      case TokenType.LESS_EQUAL: {
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) <= (right as number);
      }
      default: {
        throw new Error(
          `PANIK: You should have never reached here! Unkown operator: ${expr.operator.type}`,
        );
      }
    }
  }
  visitGroupingExpr(expr: Grouping): Value {
    return this.evaluate(expr.expr);
  }
  visitVariableExpr(expr: Variable): Value {
    return this.lookupVariable(expr.name, expr);
  }
  visitAssignExpr(expr: Assign): Value {
    const value = this.evaluate(expr.expr);

    const distance = this.locals.get(expr);

    if (distance !== undefined) {
      this.environment.assignAt(distance, expr.name, value);
    } else {
      this.globals.assign(expr.name, value);
    }

    return value;
  }
  visitLogicalExpr(expr: Logical): Value {
    const left = this.evaluate(expr.left);

    if (expr.operator.type === TokenType.AND && !this.isTruthy(left)) {
      return left;
    }

    if (expr.operator.type === TokenType.OR && this.isTruthy(left)) {
      return left;
    }

    return this.evaluate(expr.right);
  }

  /** Utils */
  private isTruthy(val: Value) {
    if (val === null || val === false) {
      return false;
    }

    return true;
  }

  private checkNumberOperands(
    operator: Token,
    left: Value,
    right: Value,
  ): void {
    if (typeof left === 'number' && typeof right === 'number') {
      return;
    }

    throw new RuntimeError(operator, 'Operands must be numbers.');
  }

  private checkStringOperands(
    operator: Token,
    left: Value,
    right: Value,
  ): void {
    if (typeof left === 'string' && typeof right === 'string') {
      return;
    }

    throw new RuntimeError(operator, 'Operands must be strings.');
  }

  private lookupVariable(name: Token, expr: Variable | This): Value {
    const distance = this.locals.get(expr);

    const value =
      distance !== undefined
        ? this.environment.getAt(distance, name.lexeme)
        : this.globals.get(name);

    return value;
  }
}
