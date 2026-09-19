# SYNTAX TEST "source.roc" "Keywords"

# Boolean constants
truth = True
#       ^^^^ constant.language.roc

falsehood = False
#           ^^^^^ constant.language.roc

# dbg keyword
debug_example = || {
    x = 42
    dbg x
#   ^^^ keyword.control.roc
    x
}

# Expect statement
expect True == True
# <------ keyword.control.roc

# Multi-line expect
expect {
# <------ keyword.control.roc
    x = 5
    y = 10
    x + y == 15
}
