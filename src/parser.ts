import type { Token } from "./lexer.ts";
import { assert } from "./util/assert.ts";

export type Node = 1;

export class Parser {
  constructor(private tokens: Token[]) {}
  private consume(kind: Token["kind"]) {
    assert(this.tokens[0].kind === kind);
    return this.tokens.shift()!.text;
  }
  // deno-lint-ignore no-explicit-any
  private or<const T extends (() => any)[]>(rules: T): ReturnType<T[number]> {
    for (const rule of rules) {
      try {
        return rule();
      } catch {
        continue;
      }
    }
    throw new Error("No rule was matched");
  }
  private optional<T>(rule: () => T) {
    try {
      return rule();
    } catch {
      return null;
    }
  }
  private many<T>(rule: () => T, atLeastOne = false) {
    const out: T[] = [];
    while (this.tokens.length) {
      try {
        out.push(rule());
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
      return rule();
    });
    if (first) out.unshift(first);
    return out;
  }

  program() {
    return this.many(this.expression);
  }
  //! Todo
  expression() {
    throw new Error("expression parsing is not yet implemented");
  }
  primary() {
    return this.or([
      this.functionLiteral,
      this.parenthesized,
      this.assignment,
      this.prefixFnCall,
      this.literal,
    ]);
  }
  //! Todo
  functionLiteral() {
    throw new Error("function literals not yet implemented");
  }
  parenthesized() {
    this.consume("openParen");
    const expr = this.expression();
    this.consume("closeParen");
    return expr;
  }
  assignment() {
    const variableName = this.consume("variableName");
    return this.or([
      () => {
        this.consume("equal");
        const value = this.expression();
        return { kind: "assignment", variableName, value } as const;
      },
      () => {
        assert(this.tokens[1]?.kind === "equal");
        const modifierFunction = this.consume("functionName");
        this.consume("equal");
        const value = this.expression();
        return {
          kind: "modifierAssignment",
          variableName,
          modifierFunction,
          value,
        } as const;
      },
      () => ({ kind: "variableRef", variableName } as const),
    ]);
  }
  prefixFnCall() {
    const name = this.consume("functionName");
    this.consume("openParen");
    const args = this.manyWithSeperator(this.expression, "comma");
    return { kind: "prefixFnCall", name, args } as const;
  }
  literal() {
    return this.or([this.string, this.number, this.array, this.dictionary]);
  }
  string() {
    return { kind: "string", value: this.consume("string").slice(1, -1) };
  }
  number() {
    return { kind: "number", value: parseFloat(this.consume("number")) };
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
      const propertyName = this.consume("variableName");
      this.consume("equal");
      const value = this.expression();
      return [propertyName, value] as const;
    }, "semicolon");
    this.consume("closeCurly");
    return { kind: "dictionary", entries } as const;
  }
}
