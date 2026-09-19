# SYNTAX TEST "source.roc" "Module-qualified types"

mirror : List(Bidi.ScalarInfo) -> Bidi.MirrorInfo
#             ^^^^ storage.type.roc
#                 ^ keyword.operator.accessor.roc
#                  ^^^^^^^^^^ storage.type.roc
#                                      ^^^^^^^^^^ storage.type.roc

request : Http.Request
#         ^^^^ storage.type.roc
#              ^^^^^^^ storage.type.roc

value = Http.default_request
#       ^^^^ storage.type.roc
