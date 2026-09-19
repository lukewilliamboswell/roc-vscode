# SYNTAX TEST "source.roc" "Modern app headers"

app [main!] { pf: platform "platform/main.roc", roc: "nightly" }
# <- keyword.control.roc
#    ^^^^^ meta.provided.roc
#             ^^ meta.package.roc
#                 ^^^^^^^^ keyword.control.roc
#                          ^^^^^^^^^^^^^^^^^^^ meta.package.roc
