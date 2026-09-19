operators = |a, b| {
    integer: a + b * 2,
    division: a // b,
    remainder: a % b,
    comparison: a >= b and a != 0,
    defaulted: None ?? 42,
    hex: 0xCAFE,
    decimal: 42.5,
}
