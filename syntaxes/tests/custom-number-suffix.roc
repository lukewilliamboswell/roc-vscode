# SYNTAX TEST "source.roc" "Custom number type suffixes"

n = -12.34.Ratio
#   ^^^^^^^^^^^^ constant.numeric.float.roc

m = 5.Ratio
#   ^^^^^^^ constant.numeric.integer.roc

c = 0x1F.U8
#   ^^^^^^^ constant.numeric.integer.roc
