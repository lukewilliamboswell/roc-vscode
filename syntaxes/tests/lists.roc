# SYNTAX TEST "source.roc" "Lists"

# Empty list
empty = []
# <----- variable.other.roc
#       ^ punctuation.brackets.square.roc
#        ^ punctuation.brackets.square.roc

# Single element list
single = [1]

# Multiple elements
multiple = [1, 2, 3]
#           ^ constant.numeric.integer.roc
#            ^ punctuation.comma.roc
#                 ^ constant.numeric.integer.roc

# Nested lists
nested = [[1, 2], [3, 4]]
#         ^ punctuation.brackets.square.roc
#                       ^ punctuation.brackets.square.roc

# List with trailing comma
with_comma = [
#            ^ punctuation.brackets.square.roc
    1,
    2,
    3,
#   ^ constant.numeric.integer.roc
#    ^ punctuation.comma.roc
]
# <- punctuation.brackets.square.roc
