import Interpreter from '../Interpreter';
import Value from '../syntax/ast/Value';
import LoxCallable from './LoxCallable';
import LoxInstance from './LoxInstance';
import LoxFunction from './LoxFunction';

export default class LoxClass implements LoxCallable {
  constructor(private name: string, public superClass: LoxClass, private methods: Record<string, LoxFunction>) {}

  findMethod(name: string): LoxFunction {
    const method = this.methods[name];

    if (method || !this.superClass) {
      return method;
    }

    return this.superClass.findMethod(name);
  }

  arity(): number {
    const init = this.findMethod('init');

    return init ? init.arity() : 0;
  }

  call(interpreter: Interpreter, args: Value[]): Value {
    const instance = new LoxInstance(this);
    const init = this.findMethod('init');

    if (init) {
      init.bindInstance(instance).call(interpreter, args);
    }

    return instance;
  }

  toString(): string {
    return this.name;
  }
}
