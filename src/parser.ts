import type { Token } from "./lexer.ts";
import { assert } from "./util/assert.ts";

type Node =
  | {
      kind: "functionLiteral";
      args: (Node & { kind: "variableDeclaration" })[];
    }
  | {
      kind: "assignment";
      variableDeclaration: Node & { kind: "variableDeclaration" };
      value: Node;
    }
  | {
      kind: "modifierAssignment";
      variableDeclaration: Node & { kind: "variableDeclaration" };
      modifierFunction: Node;
    }
  | {
      kind: "variableDeclaration";
      variableName: string;
      type: (Node & { kind: "type" }) | null;
    }
  | { kind: "variableReference"; variableName: string }
  | { kind: "functionCall"; _function: Node; args: Node[] }
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "array"; values: Node[] }
  | { kind: "dictionary"; entries: (readonly [string, Node])[] };

export class Parser {
  constructor(private tokens: Token[]) {}
  private tryWithBackup<T>(rule: () => T) {
    const backup = this.tokens.slice();
    try {
      return rule.call(this);
    } catch (e) {
      this.tokens = backup;
      throw e;
    }
  }
  private consume(kind: Token["kind"]) {
    assert(this.tokens[0].kind === kind);
    return this.tokens.shift()!.text;
  }
  // deno-lint-ignore no-explicit-any
  private or<const T extends (() => any)[]>(rules: T): ReturnType<T[number]> {
    for (const rule of rules) {
      try {
        return this.tryWithBackup(rule);
      } catch {
        continue;
      }
    }
    throw new Error("No rule was matched");
  }
  private optional<T>(rule: () => T) {
    try {
      return this.tryWithBackup(rule);
    } catch {
      return null;
    }
  }
  private many<T>(rule: () => T, atLeastOne = false) {
    const out: T[] = [];
    while (this.tokens.length) {
      try {
        out.push(this.tryWithBackup(rule));
      } catch {
        break;
      }
    }
    if (atLeastOne) assert(out.length !== 0);
    return out;
  }
  private manyWithSeperator<T>(
    rule: () => T,
    seperator: Token["kind"],
    atLeastOne = false
  ) {
    const first = this.optional(rule);
    if (atLeastOne) assert(first);
    const out = this.many(() => {
      this.consume(seperator);
      return rule.call(this);
    });
    if (first) out.unshift(first);
    return out;
  }

  program() {
    return this.manyWithSeperator(this.expression, "semicolon");
  }
  //! Todo
  expression(): Node {
    // throw new Error("Expression parsing is not yet implemented");
    const nodes = this.many(this.primary, true);
    assert(nodes.length % 2 === 1, "Expression must have odd number of nodes");
    const operands: Node[] = [];
    const operators: Node[] = [];
    function buildNode() {
      const right = operands.shift()!;
      const left = operands.shift()!;
      operands.unshift({
        kind: "functionCall",
        _function: operators.shift()!,
        args: [left, right],
      });
    }
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (i % 2 === 0) {
        operands.unshift(node);
        continue;
      }
      while (operators[0] && precedence(operators[0]) >= precedence(node)) {
        buildNode();
      }
      operators.unshift(node);
    }
    while (operators.length) buildNode();
    return operands[0];
  }
  primary(): Node {
    return this.or([
      this.functionLiteral,
      this.parenthesized,
      this.assignment,
      this.prefixFnCall,
      this.variableReference,
      this.literal,
    ]);
  }
  functionLiteral() {
    this.consume("openParen");
    const args = this.manyWithSeperator(this.variableDeclaration, "comma");
    this.consume("closeParen");
    this.consume("arrow");
    const body = this.expression();
    return { kind: "functionLiteral", args, body } as const;
  }
  parenthesized() {
    this.consume("openParen");
    const expr = this.expression();
    this.consume("closeParen");
    return expr;
  }
  assignment() {
    const variableDeclaration = this.variableDeclaration();
    return this.or([
      () => {
        this.consume("equal");
        const value = this.expression();
        return { kind: "assignment", variableDeclaration, value } as const;
      },
      () => {
        const modifierFunction = this.primary();
        this.consume("equal");
        const value = this.expression();
        return {
          kind: "modifierAssignment",
          variableDeclaration,
          modifierFunction,
          value,
        } as const;
      },
    ]);
  }
  variableDeclaration() {
    const variableName = this.consume("word");
    const type = this.optional(() => {
      this.consume("colon");
      return this.type();
    });
    return { kind: "variableDeclaration", variableName, type } as const;
  }
  variableReference() {
    const variableName = this.consume("word");
    return { kind: "variableReference", variableName } as const;
  }
  prefixFnCall() {
    const _function = this.or([
      this.parenthesized,
      this.variableReference,
      this.assignment,
    ]);
    this.consume("openParen");
    const args = this.manyWithSeperator(this.expression, "comma");
    this.consume("closeParen");
    return { kind: "functionCall", _function, args } as const;
  }
  literal() {
    return this.or([this.string, this.number, this.array, this.dictionary]);
  }
  string() {
    return {
      kind: "string",
      value: this.consume("string").slice(1, -1),
    } as const;
  }
  number() {
    return {
      kind: "number",
      value: parseFloat(this.consume("number")),
    } as const;
  }
  array() {
    this.consume("openBracket");
    const values = this.manyWithSeperator(this.expression, "comma");
    this.consume("closeBracket");
    return { kind: "array", values } as const;
  }
  dictionary() {
    this.consume("openCurly");
    const entries = this.manyWithSeperator(() => {
      const propertyName = this.consume("word");
      this.consume("equal");
      const value = this.expression();
      return [propertyName, value] as const;
    }, "semicolon");
    this.consume("closeCurly");
    return { kind: "dictionary", entries } as const;
  }
  //! TODO
  type(): null {
    throw new Error("Parsing of types has not been implemented yet.");
    // return null;
  }
}

function precedence(operator: Node): number {
  if (operator.kind !== "variableReference") return 0;
  const char = operator.variableName[0];
  // based on Scala https://docs.scala-lang.org/tour/operators.html#precedence
  if (char === "^") return 5;
  if ("*%/".includes(char)) return 4;
  if ("+-".includes(char)) return 3;
  if ("><".includes(char)) return 2;
  if ("=!".includes(char)) return 1;
  return 0;
}
