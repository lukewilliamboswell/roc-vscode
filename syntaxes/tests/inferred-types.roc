# SYNTAX TEST "source.roc" "Inferred types"

Comparable := [].{
    is_eq : _
#           ^ storage.type.inferred.roc
}
