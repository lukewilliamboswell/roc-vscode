# SYNTAX TEST "source.roc" "Tag destructuring assignments bind parameters"

Pair(first, second) = pair
# <---- entity.name.type.constructor.roc
#    ^^^^^ variable.parameter.roc
#           ^^^^^^ variable.parameter.roc
#                   ^ keyword.operator.assignment.roc
#                     ^^^^ variable.other.roc
