import { readFileSync } from 'fs';
import * as readline from 'readline';
import { Lexer } from './Lexer';
import Parser from './Parser';
import Interpreter from './Interpreter';
import {
  RuntimeError,
  runtimeError,
  ParseError,
  ResolveError,
} from './helpers/errors';
import { printValue } from './helpers/values';
import Resolver from './Resolver';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let hadError = false;
let hadRuntimeError = false;
const interpreter = new Interpreter();

const main = () => {
  const [file, ...rest] = process.argv.slice(2);

  if (rest.length > 0) {
    process.exit(64);
  }

  if (file) {
    runFile(file);
  } else {
    runPrompt();
  }
};

const runFile = (file: string) => {
  const source = readFileSync(file, { encoding: 'utf-8' });

  run(source);

  if (hadError) {
    process.exit(65);
  } else if (hadRuntimeError) {
    process.exit(70);
  }

  process.exit(0);
};

const runPrompt = () => {
  rl.question('> ', (line) => {
    if (!line || line === '') {
      process.exit(0);
    }

    run(line);

    hadError = false;

    runPrompt();
  });
};

const run = (code: string) => {
  const lexer = new Lexer(code);
  const tokens = lexer.scanTokens();

  try {
    const parser = new Parser(tokens);
    const statements = parser.parse();

    if (parser.parseError) {
      throw parser.parseError;
    }

    const resolver = new Resolver(interpreter);
    resolver.resolve(statements);

    if (resolver.resolveError) {
      throw resolver.resolveError;
    }

    printValue(interpreter.interpret(statements));
  } catch (error) {
    if (error instanceof RuntimeError) {
      hadRuntimeError = true;
      runtimeError(error);
    } else if (error instanceof ParseError || error instanceof ResolveError) {
      hadError = true;
    } else {
      throw error;
    }
  }
};

main();
