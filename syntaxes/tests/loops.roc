# SYNTAX TEST "source.roc" "Loops"

# For loop
simple_for = |list| {
# <---------- entity.name.function.roc
#             ^^^^ variable.parameter.roc
    for item in list {
#   ^^^ keyword.control.repeat.roc
#       ^^^^ variable.parameter.roc
#            ^^ keyword.control.roc
#               ^^^^ variable.other.roc
        echo!(item)
#       ^^^^^ entity.name.function.roc
#             ^^^^ variable.other.roc
    }
}

# For loop with destructuring
for_destruct = |pairs| {
    var $sum = 0
#   ^^^ keyword.control.roc
#       ^^^^ variable.other.roc
    for (a, b) in pairs {
#        ^ variable.parameter.roc
#           ^ variable.parameter.roc
#                 ^^^^^ variable.other.roc
        $sum = $sum + a + b
#              ^^^^ variable.other.roc
#                   ^ keyword.operator.arithmetic.roc
    }
    $sum
}

# While loop
simple_while = |limit| {
    var $count = 0
    while $count < limit {
#   ^^^^^ keyword.control.repeat.roc
#         ^^^^^^ variable.other.roc
#                ^ keyword.operator.roc
        $count = $count + 1
    }
    $count
}

# For loop with break
for_break = |items| {
    var $found = False
    for item in items {
        if item == "target" {
            $found = True
#                    ^^^^ constant.language.roc
            break
#           ^^^^^ keyword.control.roc
        }
    }
    $found
}
