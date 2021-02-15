import Token from '../syntax/Token';

export const runtimeError = (error: RuntimeError): void => {
  console.error(`${error.message}\n[line ${error.token.line}]`);
};

export const printError = (token: Token, message: string): void => {
  reportError(token.line, ` at ${token.lexeme}`, message);
};

export const reportError = (line: number, where: string, message: string): void => {
  console.error(`[line ${line}] Error${where}: ${message}`);
};

export class ParseError extends Error {}

export class ResolveError extends Error {}

export class RuntimeError extends Error {
  constructor(public token: Token, public message: string) {
    super(message);
  }
}
