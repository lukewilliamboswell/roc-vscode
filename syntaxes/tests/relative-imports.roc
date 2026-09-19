# SYNTAX TEST "source.roc" "Relative path imports"

import ./Markup
# <------ keyword.control.import.roc
#      ^^ punctuation.separator.path.roc
#        ^^^^^^ storage.type.roc

import ../../shared/Target exposing [Target]
#      ^^^^^^ punctuation.separator.path.roc
#                          ^^^^^^^^ keyword.control.import.roc
#                                    ^^^^^^ meta.exposed.roc

import ../ElementId as Id
#         ^^^^^^^^^ storage.type.roc
#                   ^^ keyword.control.roc
