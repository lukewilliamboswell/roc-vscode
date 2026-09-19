Config := { host : Str, port : U16 ?? 8080, timeout_ms ?: U64 }

read_timeout : Config -> Try(U64, [MissingField])
read_timeout = |config| config.?timeout_ms

localhost = Config.{ host: "localhost" }
