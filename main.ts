import { lex } from "./src/lexer.ts";
import { Parser } from "./src/parser.ts";

const code = `
add = (a, b) => a + b;
2 add 3; # this comment is rad!
4 ((a, b) => a + b) 3;
add(2, 4);
`;
console.log(new Parser(lex(code)).program());
