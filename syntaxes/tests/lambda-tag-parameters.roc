# SYNTAX TEST "source.roc" "Tag patterns in lambda parameters"

remove = |Target(selector)| selector.to_str()
#         ^^^^^^ entity.name.type.constructor.roc
#                ^^^^^^^^ variable.parameter.roc
#                           ^^^^^^^^ variable.other.roc
#                                    ^^^^^^ entity.name.function.roc

swap = |(left, right)| (right, left)
#        ^^^^ variable.parameter.roc
#              ^^^^^ variable.parameter.roc
#                       ^^^^^ variable.other.roc

head = |[first, ..]| first
#        ^^^^^ variable.parameter.roc
#               ^^ keyword.operator.roc
#                    ^^^^^ variable.other.roc

constant = |_| 0
#           ^ variable.language.wildcard.roc

nothing = || {}
#         ^ punctuation.other.roc
#          ^ punctuation.other.roc
