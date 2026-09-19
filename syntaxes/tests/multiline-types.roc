# SYNTAX TEST "source.roc" "Types spanning several lines"

Event : [
# <----- entity.name.type.definition.roc
#       ^ punctuation.brackets.square.type.roc

    Exit(I64),
#   ^^^^ entity.name.type.variant.roc
#        ^^^ storage.type.builtin.roc

    Resize({ width : U16, height : U16 }),
#   ^^^^^^ entity.name.type.variant.roc
#            ^^^^^ variable.other.member.type.roc
#                    ^^^ storage.type.builtin.roc

    Tick,
#   ^^^^ entity.name.type.variant.roc

]
# <- punctuation.brackets.square.type.roc


Config := {
# <------ entity.name.type.definition.roc
#         ^ punctuation.brackets.curly.type.roc

    host : Str,
#   ^^^^ variable.other.member.type.roc
#          ^^^ storage.type.builtin.roc

    on_event : Event => {},
#   ^^^^^^^^ variable.other.member.type.roc
#              ^^^^^ storage.type.roc

}
# <- punctuation.brackets.curly.type.roc


after = Tick
# <----- variable.other.roc
#       ^^^^ entity.name.type.constructor.roc
