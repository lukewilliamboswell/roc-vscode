# SYNTAX TEST "source.roc" "Float and integer literal classes"

ratio = 3.14
#       ^^^^ constant.numeric.float.roc

small = 1.5e-3
#       ^^^^^^ constant.numeric.float.roc

big = 2e10
#     ^^^^ constant.numeric.float.roc

typed = 2.5.F64
#       ^^^^^^^ constant.numeric.float.roc

dec = 10.Dec
#     ^^^^^^ constant.numeric.float.roc

count = 1_000_000
#       ^^^^^^^^^ constant.numeric.integer.roc

byte = 255.U8
#      ^^^^^^ constant.numeric.integer.roc

mask = 0b1010_0101
#      ^^^^^^^^^^^ constant.numeric.integer.roc

octal = 0o755
#       ^^^^^ constant.numeric.integer.roc

first = pair.0
#            ^ constant.numeric.integer.roc
