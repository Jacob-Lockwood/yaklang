# YAK

This is a programming language I'm designing. I haven't started writing the
interpreter yet, but I plan to start soon.

The rest of this file contains my informal, unfinished language design notes.

```
YAK

# static type checking

$add = ($a: Num, $b: Num) => $a + $b
Numbo = (Num, Num) => Num
$add: Numbo = ($a, $b) => $a + $b

TaskStatus = enum { Done, Scheduled, Unscheduled }

TaskPriority = enum { Urgent, High, Medium, Low }

Task = {
  status: TaskStatus;
  priority: TaskPriority;
  name: Str;
  notes: Array<
    | { kind: "paragraph"; text: Str }
    | { kind: "image"; url: Str }
  > = []
}



"abc"@replace("a", "b")
("abc" replace)("a", "b")
replace("abc")("a", "b")
replace("abc","a","b")


# primality test

($z: Num) => (1..$z fold $*) ^ 2 % $z

($z:Num)=>(1..$z fold$*)^2%$z

(1..)->(fold$*)->(^2)>->$%

$a ->  $b == ($z) => b(a($z))
$a >-> $b == ($z) => b(a($z),$z)
$a ->> $b == ($z) => b(a$z,a$z)
$z >>- $a == a($z, $z)



# fizz buzz

$=1..100each$z do{$z%3?"":"Fizz"+$z%5?"":"Buzz"}

$=1..100%[3,5]~?"":~["Fizz","Buzz"]~join""or~1..100

# esolang commenter

$a=0$1split="|"$=each$z in$1:" "repeat[$a,len($1join"")+1-$a+=len($z)]join$z++$2


$a = 0
$1 split= "|"
$ = each $z in $1: " " repeat [$a, len($1 join "") + 1 - $a += len($z)] join $z ++ $2

HTTP framework KAYAK

# app.yak
{ $serve } = import("http")
{ $register } = import("kayak")
$routes = import("./home.yak").$o ++ import()
$app = register($routes)

8000 serve $app


# home.yak
"kayak" import k

"/" k.get ($req) =>

export $o = []
```
