# SYNTAX TEST "source.roc" "Effectful record field names"

handlers = {
    init!: start_server!,
#   ^^^^^ variable.other.member.roc
#        ^ punctuation.colon.roc
#          ^^^^^^^^^^^^^ entity.name.function.roc

    respond!: |request| handle!(request),
#   ^^^^^^^^ variable.other.member.roc
#                       ^^^^^^^ entity.name.function.roc

    name: "server",
#   ^^^^ variable.other.member.roc

}
