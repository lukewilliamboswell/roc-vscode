Widget := { n : U64 }.{
    Err := [Bad]

    make : U64 -> Widget
    make = |n| { n: n }

    size : Widget -> U64
    size = |w| w.n
}
