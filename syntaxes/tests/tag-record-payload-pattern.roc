# SYNTAX TEST "source.roc" "Tag record payload patterns"

describe = |result|
	match result {
		Found({ value, index }) => value
#		^^^^^ entity.name.type.constructor.roc
#		        ^^^^^ variable.other.member.roc
#		               ^^^^^ variable.other.member.roc
		Missing => "missing"
#		^^^^^^^ entity.name.type.constructor.roc
	}
