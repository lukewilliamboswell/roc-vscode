# SYNTAX TEST "source.roc" "Import exposing clauses"

import pf.HtmlAttributes exposing [class, Attribute]
# <------ keyword.control.import.roc
#      ^^ variable.other.roc
#         ^^^^^^^^^^^^^^ entity.name.namespace.roc
#                        ^^^^^^^^ keyword.control.import.roc
#                                  ^^^^^ meta.exposed.roc
#                                         ^^^^^^^^^ meta.exposed.roc
