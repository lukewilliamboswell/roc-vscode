# SYNTAX TEST "source.roc" "Conditional expressions"

# Simple one-line if/else

one_line = if True "yes" else "no"
#          ^^  keyword.control.roc
#                        ^^^^  keyword.control.roc

# Multi-line if/else
multi_line = if True
#            ^^  keyword.control.roc
    "yes"
else
# <----  keyword.control.roc
    "no"

# If with curly braces
with_curlies = if True {
    #          ^^  keyword.control.roc
    #                  ^  punctuation.brackets.curly.roc
    "yes"
} else {
# ^^^^ keyword.control.roc
    "no"
}

# If/else if/else chain

chained = if num == 1
#         ^^  keyword.control.roc
    "one"
else if num == 2
# <----  keyword.control.roc
#    ^^  keyword.control.roc
    "two"
else if num == 3
# <----  keyword.control.roc
#    ^^  keyword.control.roc
    "three"
else
# <----  keyword.control.roc
    "other"
