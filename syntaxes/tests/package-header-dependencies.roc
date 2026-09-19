# SYNTAX TEST "source.roc" "Package header dependencies"

package [Parser] {
# <------- keyword.control.roc
#        ^^^^^^ entity.name.namespace.roc
#                ^ punctuation.brackets.curly.roc

    unicode: "../unicode/main.roc",
#   ^^^^^^^ variable.other.roc
#            ^^^^^^^^^^^^^^^^^^^^^ string.quoted.double.roc

}
# <- punctuation.brackets.curly.roc


import unicode.Grapheme
#      ^^^^^^^ variable.other.roc
#              ^^^^^^^^ entity.name.namespace.roc
