import { assert } from "./util/assert.ts";

// y flag--see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky
const tokenMap = {
  string: /"([^"]|\\")*"/y,
  number: /\d+(\.\d*)?/y,
  openCurly: /\{/y,
  closeCurly: /\}/y,
  openParen: /\(/y,
  closeParen: /\)/y,
  openBracket: /\[/y,
  closeBracket: /\]/y,
  arrow: /=>/y,
  dot: /\./y,
  comma: /,/y,
  equal: /=/y,
  tilde: /~/y,
  questionMark: /\?/y,
  colon: /:/y,
  semicolon: /;/y,
  word: /\$?\w+|[!@%^&*|\-+/`<>]+/y,
} as const;

const ignoreMap = {
  whitespace: /\s+/y,
  comment: /#.*$/my,
} as const;

for (const re of Object.values({ ...tokenMap, ...ignoreMap })) {
  assert(re.sticky);
}

export type Token = { kind: keyof typeof tokenMap; text: string };

export function lex(code: string) {
  const out: Token[] = [];
  loop: while (code.length) {
    for (const key in tokenMap) {
      const kind = key as keyof typeof tokenMap;
      const regex = tokenMap[kind];
      const execResult = regex.exec(code);
      if (execResult) {
        out.push({ kind, text: execResult[0] });
        code = code.slice(regex.lastIndex);
        regex.lastIndex = 0;
        continue loop;
      }
    }
    for (const ignore of Object.values(ignoreMap)) {
      const execResult = ignore.exec(code);
      if (execResult) {
        code = code.slice(ignore.lastIndex);
        ignore.lastIndex = 0;
        continue loop;
      }
    }
    throw new Error("Invalid token.. " + code);
  }
  return out;
}
