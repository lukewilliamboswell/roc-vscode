# SYNTAX TEST "source.roc" "Method calls on values"

size = items.len()
#      ^^^^^ variable.other.roc
#           ^ keyword.operator.accessor.roc
#            ^^^ entity.name.function.method.roc

saved = file.write!(bytes)?
#            ^^^^^^ entity.name.function.method.roc
#                         ^ keyword.control.return.roc

trimmed = "  text  ".trim()
#                    ^^^^ entity.name.function.method.roc

total = List.sum(values)
#       ^^^^ entity.name.namespace.builtin.roc
#            ^^^ entity.name.function.roc

nested = parse(input).unwrap_or(0)
#        ^^^^^ entity.name.function.roc
#                     ^^^^^^^^^ entity.name.function.method.roc

field = config.port
#              ^^^^ variable.other.member.roc
