# SYNTAX TEST "source.roc" "Tag union types"

Color : [Red, Green, Custom(U8, U8, U8)]
# <----- storage.type.roc
#       ^ punctuation.brackets.square.roc
#        ^^^ entity.name.type.variant.roc
#             ^^^^^ entity.name.type.variant.roc
#                    ^^^^^^ entity.name.type.variant.roc
#                           ^^ storage.type.builtin.roc
#                                      ^ punctuation.brackets.square.roc

parse : Str -> Try(U64, [InvalidNumber(Str), Empty, ..])
#                        ^^^^^^^^^^^^^ entity.name.type.variant.roc
#                                      ^^^ storage.type.builtin.roc
#                                            ^^^^^ entity.name.type.variant.roc
#                                                   ^^ keyword.operator.roc

Letters(others) : [A, B, ..others]
#                  ^ entity.name.type.variant.roc
#                          ^^^^^^ storage.type.parameter.roc

nested : [Scroll([Up, Down], U16)]
#         ^^^^^^ entity.name.type.variant.roc
#                 ^^ entity.name.type.variant.roc
#                     ^^^^ entity.name.type.variant.roc
#                            ^^^ storage.type.builtin.roc

payload : [Found({ index : U64 })]
#          ^^^^^ entity.name.type.variant.roc
#                  ^^^^^ variable.other.member.roc
#                          ^^^ storage.type.builtin.roc

value = Red
#       ^^^ entity.name.type.constructor.roc
