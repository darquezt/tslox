import { Fun } from '../syntax/ast/Stmt';
import Value from '../syntax/ast/Value';
import Interpreter from '../Interpreter';

import LoxCallable from './LoxCallable';
import Environment from './Environment';
import ReturnException from './ReturnException';
import LoxInstance from './LoxInstance';

export default class LoxFunction implements LoxCallable {
  constructor(private declaration: Fun, private environment: Environment, private isInitializer = false) {}

  bindInstance(instance: LoxInstance): LoxFunction {
    const boundedEnvironment = new Environment(this.environment);
    boundedEnvironment.define('this', instance);

    return new LoxFunction(this.declaration, boundedEnvironment, this.isInitializer);
  }

  arity(): number {
    return this.declaration.params.length;
  }

  call(interpreter: Interpreter, args: Value[]): Value {
    const environment = new Environment(this.environment);

    this.declaration.params.forEach((param, index) => {
      environment.define(param.lexeme, args[index]);
    });

    try {
      interpreter.executeBlock(this.declaration.body, environment);
    } catch (err) {
      if (err instanceof ReturnException) {
        if (this.isInitializer) {
          return this.environment.getAt(0, 'this');
        }

        return err.value;
      }

      throw err;
    }

    if (this.isInitializer) {
      return this.environment.getAt(0, 'this');
    }

    return null;
  }

  toString(): string {
    return `<fn ${this.declaration.name.lexeme}>`;
  }
}
