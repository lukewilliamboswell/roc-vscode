# SYNTAX TEST "source.roc" "Operators"

x = !True or False and True?
#   ^ keyword.operator.roc
#    ^^^^ constant.language.roc
#         ^^ keyword.operator.roc
#            ^^^^^ constant.language.roc
#                  ^^^ keyword.operator.roc
#                      ^^^^ constant.language.roc
#                          ^ keyword.control.return.roc

# Postfix question mark
maybe = value?
#            ^ keyword.control.return.roc

# Chained question mark with accessor
nested = data.get("key")?.get("nested")?
#                       ^ keyword.control.return.roc
#                                      ^ keyword.control.return.roc

# Question mark with ?? default
with_default = get_value() ?? 0
#                          ^^ keyword.operator.roc
