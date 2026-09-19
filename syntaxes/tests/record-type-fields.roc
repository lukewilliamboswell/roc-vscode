# SYNTAX TEST "source.roc" "Record fields in type annotations"

render : { title : Str, count : U64 } -> Str
#          ^^^^^ variable.other.member.type.roc
#                       ^^^^^ variable.other.member.type.roc
