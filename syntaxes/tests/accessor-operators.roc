# SYNTAX TEST "source.roc" "Accessor operators"

name = person.profile.name
#            ^ keyword.operator.accessor.roc
#                    ^ keyword.operator.accessor.roc

line = Stdout.line!(text)
#            ^ keyword.operator.accessor.roc
#             ^^^^^ entity.name.function.roc

entry = Table.Entry.Add(1)
#            ^ keyword.operator.accessor.roc
#                  ^ keyword.operator.accessor.roc

moved = { ..origin, x: 1 }
#         ^^ keyword.operator.roc
#           ^^^^^^ variable.other.roc
