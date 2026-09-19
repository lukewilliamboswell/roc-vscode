# SYNTAX TEST "source.roc" "Method block and construction delimiters"

Counter := { count : U64 }.{
#                         ^^ punctuation.brackets.curly.roc

    zero = Counter.{ count: 0 }
#          ^^^^^^^ entity.name.type.constructor.roc
#                 ^^ punctuation.brackets.curly.roc
#                             ^ punctuation.brackets.curly.roc

}
# <- punctuation.brackets.curly.roc
