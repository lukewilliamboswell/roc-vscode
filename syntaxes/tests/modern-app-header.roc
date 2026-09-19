# SYNTAX TEST "source.roc" "Modern app headers"

app [main!] { pf: platform "platform/main.roc", roc: "nightly-2026-09-12-220fd47" }
# <--- keyword.control.roc
#    ^^^^^ meta.provided.roc
#             ^^ meta.package.roc
#                 ^^^^^^^^ keyword.control.roc
#                          ^^^^^^^^^^^^^^^^^^^ meta.package.roc
