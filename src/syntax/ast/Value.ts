import LoxCallable from '../../runtime/LoxCallable';
import LoxInstance from '../../runtime/LoxInstance';

type Value = number | boolean | string | null | LoxCallable | LoxInstance;

export default Value;
