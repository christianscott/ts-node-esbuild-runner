import * as childProc from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import * as esbuild from "esbuild";
import * as ts from "typescript";
import * as os from "os";
import * as rimraf from "rimraf";
import * as path from "path";
import * as yargs from "yargs";

class Assert {
  static exists<T>(
    x: T | null | undefined,
    message: string = `expected x to be non-null, got ${x}`
  ): T {
    if (x == null) {
      throw new TypeError(message);
    }
    return x;
  }

  static condition(
    condition: boolean | null | undefined,
    message: string = `expected condition to be true`
  ): asserts condition {
    if (condition == false) {
      throw new Error(message);
    }
  }
}

function getDefaultOutdir(file: string): string {
  return path.join(
    os.tmpdir(),
    "ts-node-esbuild-runner",
    hash(path.join("ts-node-esbuild-runner", process.cwd(), file))
  );
}

function hash(str: string): string {
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

function replaceExtWith(file: string, newExt: string): string {
  const oldExt = new RegExp(`${path.extname(file)}$`.replace(".", "."));
  return file.replace(oldExt, newExt);
}

type CliArgs = {
  file: string;
  outdir: string | undefined;
};

function runWithEsbuild({ file, outdir = getDefaultOutdir(file) }: CliArgs) {
  rimraf.sync(path.join(outdir));

  esbuild.buildSync({
    entryPoints: [file],
    outdir,
    bundle: false,
    format: "cjs",
    platform: "node",
    tsconfig: Assert.exists(
      ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.json")
    ),
  });

  const outFiles = fs.readdirSync(outdir);

  const outfile = path.basename(replaceExtWith(file, ".js"));
  Assert.condition(
    outFiles.includes(outfile),
    `could not find output file for ${file} (expected ${outfile} to exist inside ${outdir})`
  );

  childProc;
}

function main() {
  const args: CliArgs = yargs.command("$0 <file>", "execute the file", (y) => {
    return y
      .positional("file", {
        desc: "the file to run",
        type: "string",
        demandOption: true,
      })
      .option("outdir", {
        type: "string",
      });
  }).argv;

  runWithEsbuild(args);
}

main();
