# SYNTAX TEST "source.roc" "Types and Type Annotations"

# Type annotations on variables
num : I64
# <--- variable.other.roc
#   ^ punctuation.colon.roc
#     ^^^ storage.type.builtin.roc
num = 42

list_num : List(U64)
#          ^^^^ storage.type.builtin.roc
#               ^^^ storage.type.builtin.roc
list_num = [1, 2, 3]

generic_list : List(a)
#                   ^ storage.type.parameter.roc

pair : (I64, Str)
#      ^ punctuation.brackets.round.type.roc
#            ^^^ storage.type.builtin.roc
pair = (42, "answer")

record_type : { x : I64, y : I64 }
#               ^ variable.other.member.type.roc
#                            ^^^ storage.type.builtin.roc
record_type = { x: 1, y: 2 }

fn_simple : I64 -> I64
# <--------- entity.name.function.roc
#               ^^ keyword.operator.roc
fn_simple = crash ""

fn_multiple_args : I64, Str -> I64
#                     ^ punctuation.comma.type.roc
fn_multiple_args = crash ""

higher_order : ((I64 -> I64) -> I64) -> I64
#                                    ^^ keyword.operator.roc
#                                       ^^^ storage.type.builtin.roc
higher_order = crash ""

where_clause : a -> Str where [a.to_str : a -> Str]
#                       ^^^^^ keyword.control.roc
#                                ^^^^^^ entity.name.function.roc
where_clause = crash ""

effectful_type : Str => {}
# <-------------- entity.name.function.roc
#                    ^^ keyword.operator.roc
effectful_type = crash ""

blank_type : List(Str) -> Try(I64, _)
#                         ^^^ storage.type.roc
#                                  ^ storage.type.inferred.roc
blank_type = crash ""

# Types

TypeAlias := { x : I64, y : I64 }
# <--------- entity.name.type.definition.roc
#         ^^ keyword.operator.roc

Color : [Red, Green, Blue]
# <----- storage.type.roc
#        ^^^ entity.name.type.variant.roc
#                    ^^^^ entity.name.type.variant.roc

Result : [Ok(I64), Err(Str)]
#         ^^ entity.name.type.variant.roc
#            ^^^ storage.type.builtin.roc
#                  ^^^ entity.name.type.variant.roc

Maybe(a) : [Some(a), None]
# <----- storage.type.roc
#     ^ storage.type.parameter.roc
#           ^^^^ entity.name.type.variant.roc
#                ^ storage.type.parameter.roc
#                    ^^^^ entity.name.type.variant.roc

Letters(others) : [A, B, ..others]
#       ^^^^^^ storage.type.parameter.roc
#                        ^^ keyword.operator.roc
#                          ^^^^^^ storage.type.parameter.roc
