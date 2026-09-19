# SYNTAX TEST "source.roc" "Break expressions"

first = |items| {
    for item in items {
        if item == 0 {
            break
#           ^^^^^ keyword.control.roc
        }
    }
}
