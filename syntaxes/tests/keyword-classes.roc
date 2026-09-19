# SYNTAX TEST "source.roc" "Conditional, repeat and return keywords"

check = |items| {
    for item in items {
#   ^^^ keyword.control.repeat.roc
#            ^^ keyword.control.roc

        if item == 0 {
#       ^^ keyword.control.conditional.roc

            return Err(Zero)
#           ^^^^^^ keyword.control.return.roc

        } else {
#         ^^^^ keyword.control.conditional.roc

            dbg item
#           ^^^ keyword.control.roc

        }
    }
    var $index = 0
#   ^^^ keyword.control.roc

    while $index < 10 {
#   ^^^^^ keyword.control.repeat.roc

        $index = $index + 1
    }
    match items {
#   ^^^^^ keyword.control.conditional.roc

        [] => Ok({})
        _ => Ok({})
    }
}
