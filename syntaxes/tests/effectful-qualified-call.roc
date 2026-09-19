# SYNTAX TEST "source.roc" "Effectful qualified calls"

result = Host.run!(command)
#        ^^^^ entity.name.namespace.roc
#             ^^^ entity.name.function.method.roc
#                ^ entity.name.function.roc
