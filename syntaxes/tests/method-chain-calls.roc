# SYNTAX TEST "source.roc" "Method chain calls"

result = Cmd.new("roc")
	.args(["check"])
#	^^^^ entity.name.function.method.roc
	.exec!()
#	^^^^^ entity.name.function.method.roc
