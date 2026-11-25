import { execFileSync } from "node:child_process"
import ncu from "npm-check-updates"

const updates = await ncu({ packageFile: "package.json", upgrade: true, silent: false })

if (Object.keys(updates).length > 0) {
	const npm = process.env.npm_execpath
	execFileSync(process.execPath, [npm, "install"], { stdio: "inherit" })
	execFileSync(process.execPath, [npm, "version", "patch", "--no-git-tag-version"], { stdio: "inherit" })
}
