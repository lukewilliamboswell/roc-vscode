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

[first, ..] = items
#^^^^^ variable.parameter.roc
#       ^^ keyword.operator.roc
#             ^^^^^ variable.other.roc

(left + right) == total
#^^^^ variable.other.roc
#       ^^^^^ variable.other.roc
#              ^^ keyword.operator.roc

plain = (one, two)
#        ^^^ variable.other.roc
#             ^^^ variable.other.roc
