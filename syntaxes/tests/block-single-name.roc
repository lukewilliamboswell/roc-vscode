# SYNTAX TEST "source.roc" "A braced single name is a block, not record shorthand"

y = if a { x } else { fallback }
#          ^ variable.other.roc
#                     ^^^^^^^^ variable.other.roc

z = { x, y }
#     ^ variable.other.member.roc
#        ^ variable.other.member.roc
