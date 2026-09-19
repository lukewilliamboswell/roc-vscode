# SYNTAX TEST "source.roc" "Strings and braces nested in interpolation"

label = "total: ${format(count, "items")} done"
#                 ^^^^^^ entity.name.function.roc
#                               ^^^^^^^ string.quoted.double.roc
#                                       ^ punctuation.definition.interpolation.roc
#                                         ^^^^ string.quoted.double.roc
#                        ^^^^^ variable.other.roc

after = label
# <----- variable.other.roc
#       ^^^^^ variable.other.roc

shape = "at ${render({ x: 1, y: 2 })}!"
#             ^^^^^^ entity.name.function.roc
#                      ^ variable.other.member.roc
#                                 ^ punctuation.brackets.curly.roc
#                                   ^ punctuation.definition.interpolation.roc
#                                    ^ string.quoted.double.roc

next = shape
# <---- variable.other.roc
#      ^^^^^ variable.other.roc
