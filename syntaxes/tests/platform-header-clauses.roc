# SYNTAX TEST "source.roc" "Platform header clauses"

platform "example"
# <------- keyword.control.roc
    requires {} { run! : Str => Str }
#   ^^^^^^^^ keyword.control.roc
    exposes [Host]
    packages {}
#   ^^^^^^^^ keyword.control.roc
    provides { "roc_run": run_for_host! }
#   ^^^^^^^^ keyword.control.roc
    hosted {
#   ^^^^^^ keyword.control.roc
        "roc_host_run": Host.run!,
    }
    targets: {
#   ^^^^^^^ keyword.control.roc
        inputs_dir: "targets/",
        x64mac: { inputs: ["libhost.a", app] },
    }

import Host

run_for_host! : Str => Str
run_for_host! = |input| Host.run!(input)
