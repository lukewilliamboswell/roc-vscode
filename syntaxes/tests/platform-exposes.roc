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
#       ^^^^^^ storage.type.roc

        Http,
#       ^^^^ storage.type.roc

    ]
#   ^ punctuation.brackets.square.roc

    packages {}
#   ^^^^^^^^ keyword.control.roc

    provides { "roc_main": main_for_host! }
#   ^^^^^^^^ keyword.control.roc

    targets: {
#   ^^^^^^^ keyword.control.roc

        inputs_dir: "targets/",
#       ^^^^^^^^^^ variable.other.member.roc

    }
#   ^ punctuation.brackets.curly.roc


import Stdout
#      ^^^^^^ storage.type.roc


main_for_host! : () => {}
# <-------------- entity.name.function.roc

main_for_host! = || {}
# <-------------- entity.name.function.roc
