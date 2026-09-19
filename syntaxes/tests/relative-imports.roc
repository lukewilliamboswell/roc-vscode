# SYNTAX TEST "source.roc" "Relative path imports"

import ./Markup
# <------ keyword.control.import.roc
#      ^^ punctuation.separator.path.roc
#        ^^^^^^ entity.name.namespace.roc

import ../../shared/Target exposing [Target]
#      ^^^^^^ punctuation.separator.path.roc
#                          ^^^^^^^^ keyword.control.import.roc
#                                    ^^^^^^ meta.exposed.roc

import ../ElementId as Id
#         ^^^^^^^^^ entity.name.namespace.roc
#                   ^^ keyword.control.roc
