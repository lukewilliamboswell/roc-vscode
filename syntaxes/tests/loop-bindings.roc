# SYNTAX TEST "source.roc" "Loop bindings"

walk = |pairs| {
#       ^^^^^ variable.parameter.roc

    for item in pairs {
#   ^^^ keyword.control.repeat.roc
#       ^^^^ variable.parameter.roc
#            ^^ keyword.control.roc
#               ^^^^^ variable.other.roc

        dbg item
#           ^^^^ variable.other.roc

    }
    for (left, _) in pairs {
#        ^^^^ variable.parameter.roc
#              ^ variable.language.wildcard.roc
#                 ^^ keyword.control.roc

        dbg left
#           ^^^^ variable.other.roc

    }
    for { name, age: years } in pairs {
#         ^^^^ variable.other.member.roc
#               ^^^ variable.other.member.roc
#                    ^^^^^ variable.parameter.roc
#                               ^^^^^ variable.other.roc

        dbg name
#           ^^^^ variable.other.roc

    }
}
