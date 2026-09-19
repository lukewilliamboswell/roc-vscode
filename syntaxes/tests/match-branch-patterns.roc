# SYNTAX TEST "source.roc" "Bindings in match branch patterns"

describe = |input|
#           ^^^^^ variable.parameter.roc

    match input {
#   ^^^^^ keyword.control.conditional.roc

        [] => "empty"
#       ^ punctuation.brackets.square.roc

        [first, .. as rest] => first
#        ^^^^^ variable.parameter.roc
#               ^^ keyword.operator.roc
#                  ^^ keyword.control.roc
#                     ^^^^ variable.parameter.roc
#                              ^^^^^ variable.other.roc

        [high, low, ..] if high > low => high
#        ^^^^ variable.parameter.roc
#              ^^^ variable.parameter.roc
#                       ^^ keyword.control.conditional.roc
#                          ^^^^ variable.other.roc

        (left, _) => left
#        ^^^^ variable.parameter.roc
#              ^ variable.language.wildcard.roc
#                    ^^^^ variable.other.roc

        { name, age: years } => name
#         ^^^^ variable.other.member.roc
#               ^^^ variable.other.member.roc
#                    ^^^^^ variable.parameter.roc
#                               ^^^^ variable.other.roc

        Pair(Some(inner), [head, ..]) => inner
#       ^^^^ entity.name.type.constructor.roc
#            ^^^^ entity.name.type.constructor.roc
#                 ^^^^^ variable.parameter.roc
#                          ^^^^ variable.parameter.roc

        other if other == 1 => other
#       ^^^^^ variable.parameter.roc
#                ^^^^^ variable.other.roc

        _ => "unknown"
#       ^ variable.language.wildcard.roc

    }

items = [first, second]
#        ^^^^^ variable.other.roc
#               ^^^^^^ variable.other.roc
