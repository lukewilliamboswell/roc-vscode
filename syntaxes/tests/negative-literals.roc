# SYNTAX TEST "source.roc" "Negative number literals"

below = -1
#       ^^ constant.numeric.integer.roc

point = { x: -430, y: -1.5 }
#            ^^^^ constant.numeric.integer.roc
#                     ^^^^ constant.numeric.float.roc

shifted = offset(-1500000)
#                ^^^^^^^^ constant.numeric.integer.roc

difference = total - 1
#                  ^ keyword.operator.arithmetic.roc
#                    ^ constant.numeric.integer.roc

tight = total-1
#            ^ keyword.operator.arithmetic.roc
#             ^ constant.numeric.integer.roc

after_call = size() -1
#                   ^^ constant.numeric.integer.roc

after_index = pair.0 - 2
#                    ^ keyword.operator.arithmetic.roc
#                      ^ constant.numeric.integer.roc
