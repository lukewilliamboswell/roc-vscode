# SYNTAX TEST "source.roc" "Shorthand fields mixed with explicit and effectful fields"

page = render({ title, body: "text", draft })
#               ^^^^^ variable.other.member.roc
#                      ^^^^ variable.other.member.roc
#                                    ^^^^^ variable.other.member.roc

program = { init!, respond!, shutdown! }
#           ^^^^^ variable.other.member.roc
#                  ^^^^^^^^ variable.other.member.roc
#                            ^^^^^^^^^ variable.other.member.roc

sum = add(left, right, extra)
#         ^^^^ variable.other.roc
#               ^^^^^ variable.other.roc
#                      ^^^^^ variable.other.roc

run! = |arg| start!(arg)
# <---- entity.name.function.roc
#            ^^^^^^ entity.name.function.roc

handler = state.on_event!
#               ^^^^^^^^^ entity.name.function.roc
