/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');

const main = () => {
  const [outputDir] = process.argv.slice(2);
  if (!outputDir) {
    console.error('Usage: yarn genExpr <output dir>');
    process.exit(64);
  }

  generateFile(
    outputDir,
    `import Token from '../Token';
import Value from './Value';
`,
    'Expr',
    [
      'Literal  - value: Value',
      'Logical  - operator: Token, left: Expr, right: Expr',
      'Unary    - operator: Token, expr: Expr',
      'Binary   - operator: Token, left: Expr, right: Expr',
      'Call     - callee: Expr, args: Expr[], paren: Token',
      'Getter   - object: Expr, name: Token',
      'Setter   - object: Expr, name: Token, expr: Expr',
      'This     - keyword: Token',
      'Super    - keyword: Token, method: Token',
      'Grouping - expr: Expr',
      'Variable - name: Token',
      'Assign   - name: Token, expr: Expr',
    ],
  );

  generateFile(
    outputDir,
    `import Expr, { Variable } from './Expr';
import Token from '../Token';\n  `,
    'Stmt',
    [
      'Expression - expression: Expr',
      'Fun        - name: Token, params: Token[], body: Stmt[]',
      'Print      - expression: Expr',
      'If         - condition: Expr, th: Stmt, el: Stmt',
      'Var        - name: Token, initializer: Expr',
      'While      - condition: Expr, body: Stmt',
      'Block      - statements: Stmt[]',
      'Return     - keyword: Token, value: Expr, empty = false',
      'Class      - name: Token, superClass: Variable, methods: Fun[]'
    ],
  );
};

const generateFile = (outputDir, header, baseName, types) => {
  let out = `${header}
export default abstract class ${baseName} {
  abstract accept<T>(visitor: ${baseName}Visitor<T>): T
}\n`;

  out += defineAst(baseName, types);

  out += defineVisitor(baseName, types);

  fs.writeFileSync(`${outputDir}/${baseName}.ts`, out);
};

const defineAst = (baseName, types) => {
  let out = '';

  types.forEach((type) => {
    const className = type.split('-')[0].trim();
    const fields = type.split('-')[1].trim();
    out += defineType(baseName, className, fields);
  });

  return out;
};

const defineType = (baseName, className, fields) => {
  const fieldsArgs = fields
    .split(', ')
    .map((f) => `public ${f}`)
    .join(', ');
  const type = `
export class ${className} extends ${baseName} {
  constructor(${fieldsArgs}) {
    super();
  }

  accept<T>(visitor: ${baseName}Visitor<T>): T {
    return visitor.visit${className}${baseName}(this);
  }
}\n`;

  return type;
};

const defineVisitor = (baseName, types) => {
  let out = `\nexport interface ${baseName}Visitor<T> {`;

  types.forEach((type) => {
    const className = type.split('-')[0].trim();

    out += `
  visit${className}${baseName}(${baseName.toLowerCase()}: ${className}): T;
`;
  });

  out += '}\n';

  return out;
};

main();
