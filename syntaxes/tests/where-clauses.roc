# SYNTAX TEST "source.roc" "Where clauses"

describe : a -> Str where [a.to_str : a -> Str]
#          ^ storage.type.parameter.roc
#                   ^^^^^ keyword.control.roc
#                          ^ storage.type.parameter.roc
#                            ^^^^^^ entity.name.function.roc
#                                          ^^^ storage.type.builtin.roc

next = describe(1)
# <---- variable.other.roc
#      ^^^^^^^^ entity.name.function.roc
