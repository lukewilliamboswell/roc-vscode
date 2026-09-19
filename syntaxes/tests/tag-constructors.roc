# SYNTAX TEST "source.roc" "Tag constructors"

result = Ok(value)
#        ^^ entity.name.type.constructor.roc

failure = Err(NotFound)
#         ^^^ entity.name.type.constructor.roc
#             ^^^^^^^^ entity.name.type.constructor.roc
