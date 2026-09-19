# SYNTAX TEST "source.roc" "Calls in multiline string interpolation"

message =
    \\value: ${Str.inspect(value)}
#                   ^^^^^^^ entity.name.function.roc
