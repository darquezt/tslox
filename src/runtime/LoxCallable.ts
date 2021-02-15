import Value from '../syntax/ast/Value';
import Interpreter from '../Interpreter';

interface LoxCallable {
  arity(): number
  call(interpreter: Interpreter, args: Value[]): Value
}

export default LoxCallable;
