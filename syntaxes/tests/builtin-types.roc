# SYNTAX TEST "source.roc" "Builtin and user types in annotations"

count : U64
#       ^^^ storage.type.builtin.roc

ratio : F32
#       ^^^ storage.type.builtin.roc

names : List(Str)
#       ^^^^ storage.type.builtin.roc
#            ^^^ storage.type.builtin.roc

lookup : Dict(Str, Config)
#        ^^^^ storage.type.builtin.roc
#                  ^^^^^^ storage.type.roc

stringy : Stringy
#         ^^^^^^^ storage.type.roc

handler : Request -> Try(Response, _)
#         ^^^^^^^ storage.type.roc
#                    ^^^ storage.type.roc
#                        ^^^^^^^^ storage.type.roc
