# SYNTAX TEST "source.roc" "App header package aliases"

app [main!] {
# <--- keyword.control.roc
#    ^^^^^ meta.provided.roc

    pf: platform "https://example.com/platform.tar.br",
#   ^^ meta.package.roc
#       ^^^^^^^^ keyword.control.roc
#                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ meta.package.roc

    json: "https://example.com/json.tar.br",
#   ^^^^ variable.other.roc
#         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ meta.package.roc
#         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ string.quoted.double.roc

}
# <- punctuation.brackets.curly.roc


import json.Json
# <------ keyword.control.import.roc
#      ^^^^ variable.other.roc
#           ^^^^ entity.name.namespace.roc


main! = |_args| Ok({})
# <----- entity.name.function.roc
