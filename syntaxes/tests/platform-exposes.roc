# SYNTAX TEST "source.roc" "Modules exposed by a platform"

platform "example"
# <-------- keyword.control.roc
#        ^^^^^^^^^ string.quoted.double.roc

    requires {} { main! : () => {} }
#   ^^^^^^^^ keyword.control.roc

    exposes [
#   ^^^^^^^ keyword.control.roc
#           ^ punctuation.brackets.square.roc

        Stdout,
#       ^^^^^^ entity.name.namespace.roc

        Http,
#       ^^^^ entity.name.namespace.roc

    ]
#   ^ punctuation.brackets.square.roc

    packages {}
#   ^^^^^^^^ keyword.control.roc


value = Stdout
#       ^^^^^^ entity.name.type.constructor.roc
