# SYNTAX TEST "source.roc" "Comparison, pipe and remaining arithmetic operators"

same = left == right
#           ^^ keyword.operator.roc

different = left != right
#                ^^ keyword.operator.roc

ordered = low <= mid and mid >= low
#             ^^ keyword.operator.roc
#                    ^^^ keyword.operator.roc
#                            ^^ keyword.operator.roc

strict = low < high or high > low
#            ^ keyword.operator.roc
#                   ^^ keyword.operator.roc
#                           ^ keyword.operator.roc

negated = !ready
#         ^ keyword.operator.roc
#          ^^^^^ variable.other.roc

piped = items |> List.len
#             ^^ keyword.operator.roc
#                ^^^^ storage.type.builtin.roc

whole = total // count
#             ^^ keyword.operator.arithmetic.roc

remainder = total % count
#                 ^ keyword.operator.arithmetic.roc

fallback = lookup(key) ?? 0
#                      ^^ keyword.operator.roc

assigned = 1
#        ^ keyword.operator.assignment.roc
