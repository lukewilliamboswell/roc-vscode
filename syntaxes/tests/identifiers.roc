# SYNTAX TEST "source.roc" "Identifiers"

tests = {

    value = 123
#   ^^^^^ variable.other.roc

    effectful_function! = || {}
#   ^^^^^^^^^^^^^^^^^^^ entity.name.function.roc

    var $mutable_variable = 123
#       ^^^^^^^^^^^^^^^^^ variable.other.roc

    _ = identifier.selector
#   ^ variable.language.wildcard.roc

    bare_tag = Baz
#   ^^^^^^^^ variable.other.roc

}
