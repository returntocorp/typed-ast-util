import { assert } from "chai";
import * as estree from "estree";
import { parseScript } from "esprima";
import * as lib from "../src";

// esprima-produced rules won't actually have types, but that's okay since none
// of the functionality here actually relies on types existing.

describe("tree traversal", () => {
  it("should work with an empty visitor", () => {
    const rule: lib.Rule = { create: () => ({}) };
    assert.deepEqual(
      lib.runRules(parseScript("const x = 3;"), [rule]).getReports(),
      []
    );
  });

  it("should find a node with a corresponding visitor function", () => {
    const rule: lib.Rule = {
      create: (context: lib.Context) => ({
        NewExpression(node: estree.NewExpression) {
          context.report({ node, checkId: "new-expr" });
        }
      })
    };
    const reports = lib
      .runRules(parseScript("const x = new Array();"), [rule])
      .getReports();
    assert.lengthOf(reports, 1);
    assert.equal(reports[0].node.type, "NewExpression");
  });

  it("uses an existing context if one was passed in", () => {
    const context = new lib.Context();
    const rule: lib.Rule = {
      create: (context: lib.Context) => ({
        Program(node: estree.Program) {
          context.report({ node, checkId: "found-program" });
        }
      })
    };
    const firstScript = parseScript("const x = 'low gravitas warning signal';");
    lib.runRules(firstScript, [rule], context);
    assert.lengthOf(context.getReports(), 1);
    const secondScript = parseScript("const x = 'very little gravitas indeed'");
    lib.runRules(secondScript, [rule], context);
    assert.lengthOf(context.getReports(), 2);

    assert.equal(context.getReports()[0].node, firstScript);
    assert.equal(context.getReports()[1].node, secondScript);
  });
});
