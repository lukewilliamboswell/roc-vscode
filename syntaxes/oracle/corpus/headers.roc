app [main!] { pf: platform "./platform/main.roc" }

import pf.Stdout
import pf.Stdout as Output

main! = |_args| {
    Output.line!("hello")
    Ok({})
}
