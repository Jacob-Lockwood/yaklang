# YAK

This is a programming language I'm designing. I haven't started writing the
interpreter yet, but I plan to start soon.

The rest of this file contains my informal, unfinished language design notes.

```
# mainly inspired by haskell, TS
# static type checking

add = (a: Num, b: Num) => a + b;
add: (Num, Num) => Num = (a, b) => a + b;

TaskStatus = enum { Done, Scheduled, Unscheduled };

TaskPriority = enum { Urgent, High, Medium, Low };

Task = {
  status: TaskStatus;
  priority: TaskPriority;
  name: Str;
  notes: Array<
    | { kind: "paragraph"; text: Str }
    | { kind: "image"; url: Str }
  > = []
};

product = _ foldl1 *;
sum = _ foldl1 +;
product1 = foldl1(_, *, );
sum1 = foldl1(_, +);




"abc"@replace("a", "b")
("abc" replace)("a", "b")
replace("abc")("a", "b")
replace("abc","a","b")


# primality test

(z: Num) => (1..z foldl *) ^ 2 % z

(z:Num)=>(1..z foldl*)^2%z

(1.._)->(_ foldl*)->(_^2)>->%
(^(1.._ foldl*,2)%_)
(1.._ foldl*|>(_^2)%_)
a ->  b == (z) => b(a(z))
a >-> b == (z) => b(a(z), z)
a ->> b == (z) => b(a(z), a(z))
z >>- a == a(z, z)



# fizz buzz


1..100each(z)=>print(z%3?"":"Fizz"+z%5?"":"Buzz");

1..100map(_%3?"":"Fizz"+_%5?"":"Buzz")each print;

1..100map(print(_%3?"":"Fizz"+_%5?"":"Buzz"));

1..100map(_%3?"":"Fizz"+_%5?"":"Buzz"|>print);


# esolang commenter

a=0;$1 split="|";$1 map(z)=>print(" "repeat[a,len($1 join"")+1-a+=len(z)]join z++$2

a=0;$1 split="|";$1 map(" "repeat[a,len($1 join"")+1-a+=len(_)]join z++$2)

$a = 0
$1 split= "|"
$ = each $z in $1: " " repeat [$a, len($1 join "") + 1 - $a += len($z)] join $z ++ $2

HTTP framework KAYAK

# app.yak
"http" import [$serve]
"kayak" import [$register]
$routes = import("./home.yak").$o ++ import()
$app = register($routes)

8000 serve $app


# home.yak
"kayak" import k

"/" k.get ($req) =>

export $o = []
```
