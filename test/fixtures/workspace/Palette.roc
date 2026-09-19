Palette := [Red, Green, Blue].{
	to_str : Palette -> Str
	to_str = |colour|
		match colour {
			Red => "red"
			Green => "green"
			Blue => "blue"
		}
}

expect Palette.to_str(Red) == "red"
