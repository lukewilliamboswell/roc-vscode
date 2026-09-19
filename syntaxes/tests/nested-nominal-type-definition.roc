# SYNTAX TEST "source.roc" "Nested nominal type definitions"

Blueprint :: {}.{
    Draft := { name : Str }.{
#   ^^^^^ entity.name.type.definition.roc
        is_eq : _
    }
}
