import { lex } from "./src/lexer.ts";

const code = `
$add = ($a: Num, $b: Num) => $a + $b
2 add 3 # this comment is rad!
add(2, 4)
`;
console.log(lex(code));
// console.log(lex(`$z = 2 + 2 eq 4 ? "yes" : "no"`));
