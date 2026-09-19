# SYNTAX TEST "source.roc" "Strings"

string = "abc"
#        ^^^^^ string.quoted.double.roc

# Unicode escape sequences
string_containing_unicode_escape_sequence = "Unicode escape sequence: \u(00A0)"
#                                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ string.quoted.double.roc

just_a_unicode_escape_sequence = "\u(00A0)"
#                                ^^^^^^^^^^ string.quoted.double.roc

unicode_multiple = "Line\u(000A)Break"

combining_unicode = "cafe\u(0301)"

# String interpolation
string_interpolation = "String interpolation ${x}"
#                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^ string.quoted.double.roc
#                                            ^^^^ meta.interpolation.roc

multiline_string =
    \\Line 1
    \\Line 2
    \\Line 3
#   ^^^^^^^^ string.multiline.roc

multiline_string_with_interpolation =
    \\Line 1
    \\Line 2
    \\Line 3 ${string}
#   ^^^^^^^^^^^^^^^^^^ string.multiline.roc
#            ^^^^^^^^^ meta.interpolation.roc

# Strings with special characters

special = "He said \"Hello\""

with_backslash = "Path\\to\\file"

with_dollar = "Price: $$10"

with_newline = "Line1\nLine2"

with_tab = "Column1\tColumn2"

# Escape sequences in interpolation
interp_escape = "Value: ${"escaped \"quoted\" string"}"
