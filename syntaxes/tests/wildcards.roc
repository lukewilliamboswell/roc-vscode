# SYNTAX TEST "source.roc" "Wildcard patterns"

ignore = |_, value| value
#         ^ variable.language.wildcard.roc
#            ^^^^^ variable.parameter.roc

_ = compute()
# <- variable.language.wildcard.roc

_unused = compute()
# <------- variable.other.roc

snake_case = 1
# <---------- variable.other.roc

blank : List(_)
#            ^ storage.type.inferred.roc
