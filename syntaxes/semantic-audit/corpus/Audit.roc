## Doc comment for the module type.
Audit := { count : U64, label : Str }.{
    Kind := [Small, Large(U64)]

    default : Audit
    default = { count: 0, label: "none" }

    # plain comment
    bump : Audit, U64 -> Audit
    bump = |audit, amount| { ..audit, count: audit.count + amount }

    describe : Audit -> Str
    describe = |{ count, label }| "${label}: ${count.to_str()}"
}

import Src/Widget as W exposing [make]
import Src/Widget.Err as WE

Pair(a) : (a, a)

Shape : [Circle(F64), Square(F64), Dot]

max_size : U64
max_size = (0x1F.U8).to_u64() + 1_000

ratio = 12.5e2

small = -3.I64

letter = 'a'

multi =
    \\first line ${max_size.to_str()}
    \\second line

area : Shape -> F64
area = |shape| match shape {
    Circle(r) => 3.14 * r * r
    Square(side) if side > 0.0 => side * side
    Square(_) => 0.0
    Dot => 0.0
}

swap : Pair(a) -> Pair(a)
swap = |(x, y)| (y, x)

total : List(U64) -> U64
total = |items| {
    var $sum = 0
    for item in items {
        $sum = $sum + item
    }
    for n in 1..=3 {
        $sum = $sum + n
    }
    $sum
}

classify : U64 -> Audit.Kind
classify = |n| if n < 10 and n != 7 or n == 99 {
    Small
} else {
    Large(n)
}

first_or : List(U64), U64 -> U64
first_or = |items, fallback| items.first() ?? fallback

parse : Str -> Try(U64, [BadNum])
parse = |text| {
    value = U64.from_str(text).map_err(|_| BadNum)?
    Ok(value + 1)
}

widget_size : U64 -> U64
widget_size = |n| make(n).size()

unwrap : [Wrapped(U64)] -> U64
unwrap = |w| {
    Wrapped(inner) = w
    inner
}

effect! : Str => {}
effect! = |msg| {
    dbg msg
    {}
}

expect total([1, 2, 3]) == 12
expect Audit.bump(Audit.default, 2).count == 2
