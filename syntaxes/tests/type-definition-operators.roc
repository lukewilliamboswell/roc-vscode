# SYNTAX TEST "source.roc" "Type definition operators"

Config := { host : Str }
# <------ entity.name.type.definition.roc
#      ^^ keyword.operator.roc
#                ^ punctuation.colon.roc

Opaque :: [Hidden]
# <------ entity.name.type.definition.roc
#      ^^ keyword.operator.roc
#          ^^^^^^ entity.name.type.variant.roc

Color : [Red, Green]
# <----- entity.name.type.definition.roc
#     ^ keyword.operator.roc

Pair(a, b) : (a, b)
# <---- entity.name.type.definition.roc
#    ^ storage.type.parameter.roc
#          ^ keyword.operator.roc
#                ^ storage.type.parameter.roc

Box2(item) := { item : item }
# <---- entity.name.type.definition.roc
#          ^^ keyword.operator.roc
#               ^^^^ variable.other.member.type.roc
#                      ^^^^ storage.type.parameter.roc

value : Config
#     ^ punctuation.colon.roc
#       ^^^^^^ storage.type.roc
