# SYNTAX TEST "source.roc" "Character literals and escapes"

letter = 'a'
#        ^^^ string.quoted.single.char.roc

quote = '\''
#       ^^^^ string.quoted.single.char.roc
#        ^^ constant.character.escape.roc

double = '"'
#        ^^^ string.quoted.single.char.roc

after = value
#       ^^^^^ variable.other.roc

newline = '\n'
#          ^^ constant.character.escape.roc

scalar = '\u(1F600)'
#         ^^^^^^^^^ constant.character.escape.roc

text = "tab\t here \"quoted\" back\\slash \$ \u(00e9)"
#          ^^ constant.character.escape.roc
#                  ^^ constant.character.escape.roc
#                                 ^^ constant.character.escape.roc
#                                         ^^ constant.character.escape.roc
#                                            ^^^^^^^^ constant.character.escape.roc
#             ^^^^ string.quoted.double.roc

multi =
    \\line with \n escape
#               ^^ constant.character.escape.roc
#     ^^^^ string.multiline.roc
