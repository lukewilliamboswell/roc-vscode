ResultValue(a) : [Ok(a), Err(Str)]

map_result : ResultValue(a), (a -> b) -> ResultValue(b)
map_result = |result, transform| {
    match result {
        Ok(value) => Ok(transform(value))
        Err(message) => Err(message.trim())
    }
}
