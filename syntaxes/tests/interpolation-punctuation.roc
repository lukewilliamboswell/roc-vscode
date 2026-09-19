# SYNTAX TEST "source.roc" "Interpolation delimiters"

greeting = "Hello, ${name}!"
#                  ^^ punctuation.definition.interpolation.roc
#                    ^^^^ variable.other.roc
#                    ^^^^ meta.interpolation.roc
#                        ^ punctuation.definition.interpolation.roc
#                         ^ string.quoted.double.roc

pair = "${first}${second}"
#               ^^ punctuation.definition.interpolation.roc
#                       ^ punctuation.definition.interpolation.roc
#                 ^^^^^^ variable.other.roc

multi =
    \\total: ${Num.to_str(total)} items
#            ^^ punctuation.definition.interpolation.roc
#              ^^^ entity.name.namespace.builtin.roc
#                               ^ punctuation.definition.interpolation.roc
#                                 ^^^^^ string.multiline.roc
