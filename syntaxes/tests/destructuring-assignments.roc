# SYNTAX TEST "source.roc" "Destructuring assignments"

(minimum, maximum) = sort(x, y)
#^^^^^^^ variable.parameter.roc
#         ^^^^^^^ variable.parameter.roc
#                  ^ keyword.operator.assignment.roc
#                    ^^^^ entity.name.function.roc
#                         ^ variable.other.roc

{ width, height: tall } = size
# ^^^^^ variable.other.member.roc
#        ^^^^^^ variable.other.member.roc
#                ^^^^ variable.parameter.roc
#                         ^^^^ variable.other.roc

plain = (one, two)
#        ^^^ variable.other.roc
#             ^^^ variable.other.roc

nested = |pair| {
#         ^^^^ variable.parameter.roc

    (first, second) = pair
#    ^^^^^ variable.parameter.roc
#           ^^^^^^ variable.parameter.roc
#                     ^^^^ variable.other.roc

    (first + second) == 3
#    ^^^^^ variable.other.roc
#            ^^^^^^ variable.other.roc
#                    ^^ keyword.operator.roc

}
# <- punctuation.brackets.curly.roc
