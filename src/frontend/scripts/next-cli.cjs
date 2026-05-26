const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectDir = path.resolve(__dirname, "..");
const nextBin = path.join("node_modules", "next", "dist", "bin", "next");
const nodeArgs = ["--preserve-symlinks", "--preserve-symlinks-main", nextBin, ...process.argv.slice(2)];

function run(cwd, cleanup) {
  const child = spawn(process.execPath, nodeArgs, {
    cwd,
    env: process.env,
    stdio: "inherit",
    windowsHide: false
  });

  child.on("exit", (code, signal) => {
    if (cleanup) {
      cleanup();
    }

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

function createSubstDrive() {
  for (const letter of "QRSTUVWXYZ") {
    const drive = `${letter}:`;
    const root = `${drive}\\`;

    if (fs.existsSync(root)) {
      continue;
    }

    const result = spawnSync("subst", [drive, projectDir], { stdio: "ignore" });
    if (result.status === 0) {
      return {
        root,
        cleanup: () => spawnSync("subst", [drive, "/D"], { stdio: "ignore" })
      };
    }
  }

  return null;
}

if (process.platform === "win32") {
  const mappedDrive = createSubstDrive();
  if (mappedDrive) {
    run(mappedDrive.root, mappedDrive.cleanup);
  } else {
    run(projectDir);
  }
} else {
  run(projectDir);
}
