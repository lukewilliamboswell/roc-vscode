# SYNTAX TEST "source.roc" "Function binding names"

render_document : Str -> Str
# <--------------- entity.name.function.roc
render_document = |source| source
# <--------------- entity.name.function.roc

write_output! = |contents| Stdout.line!(contents)
# <------------- entity.name.function.roc
