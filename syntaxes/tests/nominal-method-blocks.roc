# SYNTAX TEST "source.roc" "Method blocks end the type expression"

Counter := { count : U64 }.{
# <------- entity.name.type.definition.roc
#            ^^^^^ variable.other.member.type.roc
#                    ^^^ storage.type.builtin.roc

    increment : Counter -> Counter
#   ^^^^^^^^^ entity.name.function.roc
#               ^^^^^^^ storage.type.roc

    increment = |counter| Counter.{ count: counter.count + 1 }
#   ^^^^^^^^^ entity.name.function.roc
#                ^^^^^^^ variable.parameter.roc
#                         ^^^^^^^ entity.name.type.constructor.roc
#                                   ^^^^^ variable.other.member.roc

}
# <- punctuation.brackets.curly.roc


Shape := [Circle(F64), Square(F64)].{
#         ^^^^^^ entity.name.type.variant.roc
#                ^^^ storage.type.builtin.roc

    area = |shape| 0.0
#   ^^^^ entity.name.function.roc
#           ^^^^^ variable.parameter.roc
#                  ^^^ constant.numeric.float.roc

}
# <- punctuation.brackets.curly.roc
