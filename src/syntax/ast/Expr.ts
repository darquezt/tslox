import Token from '../Token';
import Value from './Value';

export default abstract class Expr {
  abstract accept<T>(visitor: ExprVisitor<T>): T
}

export class Literal extends Expr {
  constructor(public value: Value) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitLiteralExpr(this);
  }
}

export class Logical extends Expr {
  constructor(public operator: Token, public left: Expr, public right: Expr) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitLogicalExpr(this);
  }
}

export class Unary extends Expr {
  constructor(public operator: Token, public expr: Expr) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitUnaryExpr(this);
  }
}

export class Binary extends Expr {
  constructor(public operator: Token, public left: Expr, public right: Expr) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitBinaryExpr(this);
  }
}

export class Call extends Expr {
  constructor(public callee: Expr, public args: Expr[], public paren: Token) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitCallExpr(this);
  }
}

export class Getter extends Expr {
  constructor(public object: Expr, public name: Token) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitGetterExpr(this);
  }
}

export class Setter extends Expr {
  constructor(public object: Expr, public name: Token, public expr: Expr) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitSetterExpr(this);
  }
}

export class This extends Expr {
  constructor(public keyword: Token) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitThisExpr(this);
  }
}

export class Super extends Expr {
  constructor(public keyword: Token, public method: Token) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitSuperExpr(this);
  }
}

export class Grouping extends Expr {
  constructor(public expr: Expr) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitGroupingExpr(this);
  }
}

export class Variable extends Expr {
  constructor(public name: Token) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitVariableExpr(this);
  }
}

export class Assign extends Expr {
  constructor(public name: Token, public expr: Expr) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitAssignExpr(this);
  }
}

export interface ExprVisitor<T> {
  visitLiteralExpr(expr: Literal): T;

  visitLogicalExpr(expr: Logical): T;

  visitUnaryExpr(expr: Unary): T;

  visitBinaryExpr(expr: Binary): T;

  visitCallExpr(expr: Call): T;

  visitGetterExpr(expr: Getter): T;

  visitSetterExpr(expr: Setter): T;

  visitThisExpr(expr: This): T;

  visitSuperExpr(expr: Super): T;

  visitGroupingExpr(expr: Grouping): T;

  visitVariableExpr(expr: Variable): T;

  visitAssignExpr(expr: Assign): T;
}
