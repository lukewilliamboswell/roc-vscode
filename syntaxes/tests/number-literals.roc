# SYNTAX TEST "source.roc" "Number literals"

inferred = 5
#          ^ constant.numeric.integer.roc

explicit_u8 = 5.U8
#             ^^^^ constant.numeric.integer.roc

char_to_u8 = 'a'.U8
#            ^^^ string.quoted.single.char.roc

hex = 0x5
#     ^^^ constant.numeric.integer.roc

octal = 0o5
#       ^^^ constant.numeric.integer.roc

binary = 0b0101
#        ^^^^^^ constant.numeric.integer.roc
