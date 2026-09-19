# SYNTAX TEST "source.roc" "Method chain calls"

result = Cmd.new("roc")
	.args(["check"])
#	^^^^ entity.name.function.roc
	.exec!()
#	^^^^^ entity.name.function.roc
