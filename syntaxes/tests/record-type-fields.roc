# SYNTAX TEST "source.roc" "Record fields in type annotations"

render : { title : Str, count : U64 } -> Str
#          ^^^^^ variable.other.member.roc
#                       ^^^^^ variable.other.member.roc
