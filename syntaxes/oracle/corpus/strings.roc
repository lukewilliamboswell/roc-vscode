describe = |name| {
    line = "Hello, ${name.trim()} 😀\n"
    multiline =
        \\First line
        \\Second ${line}

    (line, multiline, '\u(00A0)')
}
