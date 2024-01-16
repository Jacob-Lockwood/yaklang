import type { Token } from "./lexer.ts";
import { assert } from "./util/assert.ts";

export type RuntimeNode =
  | {
      kind: "functionLiteral";
      args: (RuntimeNode & { kind: "variableDeclaration" })[];
    }
  | {
      kind: "assignment";
      variableDeclaration: RuntimeNode & { kind: "variableDeclaration" };
      value: RuntimeNode;
    }
  | {
      kind: "modifierAssignment";
      variableDeclaration: RuntimeNode & { kind: "variableDeclaration" };
      modifierFunction: RuntimeNode;
    }
  | {
      kind: "variableDeclaration";
      variableName: string;
      type: TypeNode | null;
    }
  | { kind: "variableReference"; variableName: string }
  | { kind: "functionCall"; _function: RuntimeNode; args: RuntimeNode[] }
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "array"; values: RuntimeNode[] }
  | { kind: "dictionary"; entries: (readonly [string, RuntimeNode])[] };

type TypeNode =
  | { kind: "arrayType"; type: TypeNode }
  | {
      kind: "functionType";
      args: (RuntimeNode & { kind: "variableDeclaration" })[];
      returnType: TypeNode;
    }
  | { kind: "dictionaryType"; entries: (readonly [string, TypeNode])[] }
  | { kind: "stringType"; value: string }
  | { kind: "numberType"; value: number }
  | { kind: "unionType"; members: TypeNode[] }
  | { kind: "intersectionType"; members: TypeNode[] };

export type Node = RuntimeNode | TypeNode;

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
    seperator: Token["kind"] | (() => void),
    atLeastOne = false
  ) {
    const first = this.optional(rule);
    if (atLeastOne) assert(first);
    const out = this.many(() => {
      if (typeof seperator === "string") this.consume(seperator);
      else seperator.call(this);
      return rule.call(this);
    });
    if (first) out.unshift(first);
    return out;
  }

  program() {
    return this.manyWithSeperator(this.statement, "semicolon");
  }
  statement() {
    return this.or([
      this.expression,
      this.typeDefinition,
      this.genericTypeDefinition,
    ]);
  }
  expression(): RuntimeNode {
    const nodes = this.many(this.primary, true);
    assert(nodes.length % 2 === 1, "Expression must have odd number of nodes");
    const operands: RuntimeNode[] = [];
    const operators: RuntimeNode[] = [];
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
  primary(): RuntimeNode {
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

  //! TODO support union and intersection types
  type(): TypeNode {
    return this.primaryType();
  }
  genericTypeDefinition() {
    const typeName = this.consume("typeName");
    assert(this.consume("word") === "<");
    const genericArgs = this.manyWithSeperator(
      () => this.consume("typeName"),
      "comma"
    );
    assert(this.consume("word") === ">");
    this.consume("equal");
    const type = this.type();
    return {
      kind: "genericTypeDefinition",
      typeName,
      genericArgs,
      type,
    } as const;
  }
  typeDefinition() {
    const typeName = this.consume("typeName");
    this.consume("equal");
    const type = this.type();
    return { kind: "typeDefinition", typeName, type } as const;
  }
  genericTypeReference() {
    const typeName = this.consume("typeName");
    assert(this.consume("word") === "<");
    const typeArgs = this.manyWithSeperator(this.type, "comma");
    assert(this.consume("word") === ">");
    return { kind: "genericTypeReference", typeName, typeArgs } as const;
  }
  typeReference() {
    return {
      kind: "typeReference",
      typeName: this.consume("typeName"),
    } as const;
  }
  primaryType(): TypeNode {
    return this.or([
      this.functionType,
      this.arrayType,
      this.parenthesizedType,
      this.dictionaryType,
      this.numberType,
      this.stringType,
    ]);
  }
  parenthesizedType() {
    this.consume("openParen");
    const type = this.type();
    this.consume("closeParen");
    return type;
  }
  arrayType() {
    this.consume("openBracket");
    const type = this.type();
    this.consume("closeBracket");
    return { kind: "arrayType", type } as const;
  }
  functionType() {
    this.consume("openParen");
    const args = this.manyWithSeperator(this.variableDeclaration, "comma");
    this.consume("closeParen");
    this.consume("arrow");
    const returnType = this.type();
    return { kind: "functionType", args, returnType } as const;
  }
  dictionaryType() {
    this.consume("openCurly");
    const entries = this.manyWithSeperator(() => {
      const propertyName = this.consume("word");
      this.consume("colon");
      const type = this.type();
      return [propertyName, type] as const;
    }, "semicolon");
    this.consume("closeCurly");
    return { kind: "dictionaryType", entries } as const;
  }
  numberType() {
    return {
      kind: "numberType",
      value: parseFloat(this.consume("number")),
    } as const;
  }
  stringType() {
    return {
      kind: "stringType",
      value: this.consume("string").slice(1, -1),
    } as const;
  }
}

function precedence(operator: RuntimeNode): number {
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
