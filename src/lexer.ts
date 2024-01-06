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
  word: /\$?([A-Za-z_]+|[!@%^&*|\-+/`<>]+)/y,
} as const;

const ignoreMap = {
  whitespace: /\s+/y,
  comment: /#.*$/my,
} as const;

export function lex(code: string) {
  const out = [];
  loop: while (code.length) {
    // console.log(out);
    for (const kind in tokenMap) {
      const regex = tokenMap[kind as keyof typeof tokenMap];
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