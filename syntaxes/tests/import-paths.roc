# SYNTAX TEST "source.roc" "Import paths, nested types and aliases"

import json.Parser.ParseErr as PE
#      ^^^^ variable.other.roc
#           ^^^^^^ storage.type.roc
#                 ^ keyword.operator.accessor.roc
#                  ^^^^^^^^ storage.type.roc
#                           ^^ keyword.control.roc
#                              ^^ storage.type.roc

import Src/Widget as Widget
#      ^^^ storage.type.roc
#         ^ punctuation.separator.path.roc
#          ^^^^^^ storage.type.roc
#                    ^^^^^^ storage.type.roc

import /Public/Api
#      ^ punctuation.separator.path.roc
#       ^^^^^^ storage.type.roc
#             ^ punctuation.separator.path.roc
#              ^^^ storage.type.roc

import ./Internal/Http/Client exposing [send, Request as Req, run!]
#      ^^ punctuation.separator.path.roc
#                ^ punctuation.separator.path.roc
#                      ^^^^^^ storage.type.roc
#                                       ^^^^ meta.exposed.roc entity.name.function.roc
#                                             ^^^^^^^ meta.exposed.roc storage.type.roc
#                                                     ^^ keyword.control.roc
#                                                        ^^^ meta.exposed.roc storage.type.roc
#                                                             ^^^^ meta.exposed.roc entity.name.function.roc
