# Change Log

## Unreleased

- Require VS Code 1.82 or newer. Earlier versions could install the extension but it never started the language server.
- Fix line comments: the toggle-comment command now inserts `#` rather than `//`.
- "Roc: Restart" now really restarts the language server, picks up a changed `roc.path`, and reports a server that cannot be started with the path and setting to fix.
- Stop shipping the grammar test manifest inside the extension.
- Add semantic TextMate scopes for functions, parameters, record members, namespaces, tag constructors, type definitions, headers and imports.

## v0.0.5

- Fix brackets not automatically closing.
- Fix code folding.

## v0.0.4

- Fix CI.

## v0.0.3

- Fix CI.

## v0.0.2

- Fix CI.

## v0.0.1

- Fix CI.

## v0.0.0

- Initial version.
