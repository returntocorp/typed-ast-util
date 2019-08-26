import * as estree from "estree";
import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import * as rule from "./rule";

export * from "./rule";

type Point = {
  line: number;
  col?: number;
};

type Result = {
  check_id: string;
  path: string;
  start?: Point;
  end?: Point;
  extra?: any;
};

function positionToPoint(position: estree.Position): Point {
  return {
    line: position.line,
    col: position.column
  };
}

// Convert from the internal typed-ast-rule format to the r2c analyzer format.
function reportToResult(report: rule.Report, path: string): Result {
  const result: Result = {
    check_id: report.checkId,
    path
  };
  if (report.extra) {
    result.extra = report.extra;
  }
  const loc = report.node.loc;
  if (!loc) {
    return result;
  }
  if (loc.start) {
    result.start = positionToPoint(loc.start);
  }
  if (loc.end) {
    result.end = positionToPoint(loc.end);
  }
  return result;
}

// Runs the given rules over all .ast.json files contained in the given
// directory. The output paths are obtained from the input paths by interpreting
// them as relative to the input directory and then stripping off the .ast.json
// suffix.
export async function checkAllASTs(
  rules: ReadonlyArray<rule.Rule>,
  inputDir: string
): Promise<Result[]> {
  const astPaths = glob.sync("**/*.ast.json", {
    cwd: inputDir,
    dot: true,
    absolute: true
  });
  const results = [];
  for (const astPath of astPaths) {
    const ast = JSON.parse(await fs.promises.readFile(astPath, "utf8"));
    for (const report of rule.runRules(ast, rules).getReports()) {
      let originalPath = path.relative(inputDir, astPath);
      // Trim off the .ast.json suffix to recover the original.
      originalPath = originalPath.substring(
        0,
        originalPath.lastIndexOf(".ast.json")
      );
      results.push(reportToResult(report, originalPath));
    }
  }
  return results;
}
