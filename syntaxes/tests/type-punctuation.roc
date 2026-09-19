# SYNTAX TEST "source.roc" "Type-level punctuation"

add : I64, I64 -> I64
#        ^ punctuation.comma.type.roc

point : { x : F64, y : F64 }
#       ^ punctuation.brackets.curly.type.roc
#                ^ punctuation.comma.type.roc
#         ^ variable.other.member.type.roc
#                          ^ punctuation.brackets.curly.type.roc

pair : (Str, U64)
#      ^ punctuation.brackets.round.type.roc
#          ^ punctuation.comma.type.roc
#               ^ punctuation.brackets.round.type.roc

apply : (a -> b), a -> b
#       ^ punctuation.brackets.round.type.roc
#               ^ punctuation.comma.type.roc

lookup : Dict(Str, U64)
#            ^ punctuation.brackets.round.roc
#                ^ punctuation.comma.roc
#                     ^ punctuation.brackets.round.roc

status : [Ready, Failed(Str, U64)]
#        ^ punctuation.brackets.square.type.roc
#              ^ punctuation.comma.roc
#                      ^ punctuation.brackets.round.roc
#                          ^ punctuation.comma.roc
#                                ^ punctuation.brackets.square.type.roc

value = { x: 1.0, y: 2.0 }
#       ^ punctuation.brackets.curly.roc
#               ^ punctuation.comma.roc
#         ^ variable.other.member.roc
