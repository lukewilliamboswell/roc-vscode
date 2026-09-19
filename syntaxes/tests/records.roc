# SYNTAX TEST "source.roc" "Records"

# Empty record
empty_rec = {}
#           ^ punctuation.brackets.curly.roc
#            ^ punctuation.brackets.curly.roc

# Simple record
point = { x: 10, y: 20 }
#         ^ variable.other.member.roc
#          ^ punctuation.colon.roc
#            ^^ constant.numeric.integer.roc
#                ^ variable.other.member.roc

# Nested records
nested = { outer: { inner: 1, value: 2 } }
#          ^^^^^ variable.other.member.roc
#                   ^^^^^ variable.other.member.roc
#                             ^^^^^ variable.other.member.roc

# Record update with spread
updated = { ..point, x: 100 }
#           ^^ keyword.operator.roc
#             ^^^^^ variable.other.roc
#                    ^ variable.other.member.roc
