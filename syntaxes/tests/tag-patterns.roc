# SYNTAX TEST "source.roc" "Tag patterns"

message = |result|
    match result {
        Ok(value) => value
#       ^^ entity.name.type.constructor.roc
#          ^^^^^ variable.parameter.roc
        Err(_) => "failed"
#       ^^^ entity.name.type.constructor.roc
    }
