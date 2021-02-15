import Expr, { Variable } from './Expr';
import Token from '../Token';
  
export default abstract class Stmt {
  abstract accept<T>(visitor: StmtVisitor<T>): T
}

export class Expression extends Stmt {
  constructor(public expression: Expr) {
    super();
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitExpressionStmt(this);
  }
}

export class Fun extends Stmt {
  constructor(public name: Token, public params: Token[], public body: Stmt[]) {
    super();
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitFunStmt(this);
  }
}

export class Print extends Stmt {
  constructor(public expression: Expr) {
    super();
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitPrintStmt(this);
  }
}

export class If extends Stmt {
  constructor(public condition: Expr, public th: Stmt, public el: Stmt) {
    super();
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitIfStmt(this);
  }
}

export class Var extends Stmt {
  constructor(public name: Token, public initializer: Expr) {
    super();
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitVarStmt(this);
  }
}

export class While extends Stmt {
  constructor(public condition: Expr, public body: Stmt) {
    super();
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitWhileStmt(this);
  }
}

export class Block extends Stmt {
  constructor(public statements: Stmt[]) {
    super();
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitBlockStmt(this);
  }
}

export class Return extends Stmt {
  constructor(public keyword: Token, public value: Expr, public empty = false) {
    super();
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitReturnStmt(this);
  }
}

export class Class extends Stmt {
  constructor(public name: Token, public superClass: Variable, public methods: Fun[]) {
    super();
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitClassStmt(this);
  }
}

export interface StmtVisitor<T> {
  visitExpressionStmt(stmt: Expression): T;

  visitFunStmt(stmt: Fun): T;

  visitPrintStmt(stmt: Print): T;

  visitIfStmt(stmt: If): T;

  visitVarStmt(stmt: Var): T;

  visitWhileStmt(stmt: While): T;

  visitBlockStmt(stmt: Block): T;

  visitReturnStmt(stmt: Return): T;

  visitClassStmt(stmt: Class): T;
}
