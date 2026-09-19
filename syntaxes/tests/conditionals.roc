# SYNTAX TEST "source.roc" "Conditional expressions"

# Simple one-line if/else

one_line = if True "yes" else "no"
#          ^^  keyword.control.conditional.roc
#                        ^^^^  keyword.control.conditional.roc

# Multi-line if/else
multi_line = if True
#            ^^  keyword.control.conditional.roc
    "yes"
else
# <----  keyword.control.conditional.roc
    "no"

# If with curly braces
with_curlies = if True {
    #          ^^  keyword.control.conditional.roc
    #                  ^  punctuation.brackets.curly.roc
    "yes"
} else {
# ^^^^ keyword.control.conditional.roc
    "no"
}

# If/else if/else chain

chained = if num == 1
#         ^^  keyword.control.conditional.roc
    "one"
else if num == 2
# <----  keyword.control.conditional.roc
#    ^^  keyword.control.conditional.roc
    "two"
else if num == 3
# <----  keyword.control.conditional.roc
#    ^^  keyword.control.conditional.roc
    "three"
else
# <----  keyword.control.conditional.roc
    "other"
