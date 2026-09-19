# SYNTAX TEST "source.roc" "Method declarations in nominal method bodies"

Palette := U8.{
    normalize : U8 -> U8
#   ^^^^^^^^^ entity.name.function.roc
    normalize = |value| value
#   ^^^^^^^^^ entity.name.function.roc
}
