# SYNTAX TEST "source.roc" "Types spanning several lines"

Event : [
# <----- storage.type.roc
#       ^ punctuation.brackets.square.roc

    Exit(I64),
#   ^^^^ entity.name.type.variant.roc
#        ^^^ storage.type.builtin.roc

    Resize({ width : U16, height : U16 }),
#   ^^^^^^ entity.name.type.variant.roc
#            ^^^^^ variable.other.member.roc
#                    ^^^ storage.type.builtin.roc

    Tick,
#   ^^^^ entity.name.type.variant.roc

]
# <- punctuation.brackets.square.roc


Config := {
# <------ entity.name.type.definition.roc
#         ^ punctuation.brackets.curly.roc

    host : Str,
#   ^^^^ variable.other.member.roc
#          ^^^ storage.type.builtin.roc

    on_event : Event => {},
#   ^^^^^^^^ variable.other.member.roc
#              ^^^^^ storage.type.roc

}
# <- punctuation.brackets.curly.roc


after = Tick
# <----- variable.other.roc
#       ^^^^ entity.name.type.constructor.roc
