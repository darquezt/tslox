import Expr, { ExprVisitor, Literal, Unary, Binary, Grouping, Variable, Assign, Logical, Call, Getter, Setter } from '../syntax/ast/Expr';

export default class AstPrinter implements ExprVisitor<string> {
  visitSuperExpr(): string {
    return 'super';
  }
  visitThisExpr(): string {
    return 'this';
  }
  visitGetterExpr(expr: Getter): string {
    return this.parenthesize(`get ${expr.name.lexeme}`, [ expr.object ]);
  }
  visitSetterExpr(expr: Setter): string {
    return this.parenthesize(`set ${expr.name.lexeme}`, [ expr.object, expr.expr ]);
  }
  visitCallExpr(expr: Call): string {
    return this.parenthesize('call', [ expr.callee, ...expr.args ]);
  }

  visitLogicalExpr(expr: Logical): string {
    return this.parenthesize(expr.operator.lexeme, [ expr.left, expr.right ]);
  }

  visitAssignExpr(expr: Assign): string {
    return this.parenthesize(`assign ${expr.name.lexeme}`, [ expr.expr ]);
  }

  visitVariableExpr(expr: Variable): string {
    return expr.name.lexeme;
  }

  print(expr: Expr): string {
    return expr.accept(this);
  }

  visitBinaryExpr(expr: Binary): string {
    return this.parenthesize(expr.operator.lexeme, [ expr.left, expr.right ]);
  }

  visitGroupingExpr(expr: Grouping): string {
    return this.parenthesize('group', [ expr.expr ]);
  }

  visitLiteralExpr(expr: Literal): string {
    if (expr.value === null) {
      return 'nil';
    }

    return String(expr.value);
  }

  visitUnaryExpr(expr: Unary): string {
    return this.parenthesize(expr.operator.lexeme, [ expr.expr ]);
  }

  parenthesize(name: string, exprs: Expr[]): string {
    const printedExprs = exprs.map((e) => e.accept<string>(this)).join(' ');

    return `(${name} ${printedExprs})`;
  }
}
