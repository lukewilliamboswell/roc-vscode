# SYNTAX TEST "source.roc" "Match expressions"

# Simple match on tags, payload and wildcard
simple_match = |color| {
    match color {
#   ^^^^^ keyword.control.conditional.roc
#         ^^^^^ variable.other.roc
        Red => "Red"
#       ^^^ entity.name.type.constructor.roc
#           ^^ keyword.operator.roc
#              ^^^^^ string.quoted.double.roc
        Ok(value) => "Success: ${value}"
#       ^^ entity.name.type.constructor.roc
#          ^^^^^ variable.parameter.roc
#                                ^^^^^ variable.other.roc
        Bar => "Just Bar"
        _ => "other"
#       ^ variable.language.wildcard.roc
    }
}

# Multiple patterns and guards
multi_pattern = |x| {
    match x {
        1 | 2 | 3 => "small"
#       ^ constant.numeric.integer.roc
#         ^ punctuation.other.roc
#               ^ constant.numeric.integer.roc
        n if n > 10 => "big"
#       ^ variable.parameter.roc
#         ^^ keyword.control.conditional.roc
#            ^ variable.other.roc
        _ => "medium"
    }
}

# Match on records
match_record = |person| {
    match person {
        { name: "Alice" } => "Hi Alice"
#         ^^^^ variable.other.member.roc
#               ^^^^^^^ string.quoted.double.roc
        { name: "Bob", age: a } if a > 30 => "Old Bob"
#                      ^^^ variable.other.member.roc
#                           ^ variable.parameter.roc
#                                  ^ variable.other.roc
        { x, y } => x + y
#         ^ variable.other.member.roc
#            ^ variable.other.member.roc
#                   ^ variable.other.roc
        _ => "Someone else"
    }
}

# Match on tuples
match_tuple = |pair| {
    match pair {
        (1, 2) => "one two"
#        ^ constant.numeric.integer.roc
        (x, _) => x
#        ^ variable.parameter.roc
#           ^ variable.language.wildcard.roc
    }
}

# Match on lists with spread and pattern alias
match_list = |lst| {
    match lst {
        [] => "empty"
        [x] => "single: ${x}"
#        ^ variable.parameter.roc
        [1, ..] => "starts with 1"
#           ^^ keyword.operator.roc
        [.., 1] => "ends with 1"
        [x, .. as tail] => "head: ${x}"
#              ^^ keyword.control.roc
#                 ^^^^ variable.parameter.roc
        _ => "other list"
    }
}
