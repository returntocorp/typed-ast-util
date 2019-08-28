import * as estree from "estree";
import * as walker from "estree-walker";

declare module "estree" {
  export interface BaseNode {
    inferredType?: any;
  }
}

// We export the internal walking logic because some rules may want to start a
// 'sub-walker'. For example, a rule might look for an async function, then walk
// over it looking for unused Promises.

// This is the type of handlers for entering/leaving an AST walker.
export type Listener = (
  // If invoked, the rule will not recurse into the children of this node.
  this: { skip: () => void },
  node: estree.Node,
  // All three of these are undefined on the root node. Otherwise, we have that
  // parent[prop] === node, or parent[prop][index] === node if parent[prop] is
  // an array.
  parent?: estree.Node,
  prop?: string,
  index?: number
) => void;

// Walks over the AST rooted at the given node in a depth-first manner. The
// `enter` listener is called when a node is visited, before any of its
// children, and the `leave` listener is called after all of its children have
// been visited.
export function walk(
  root: estree.Node,
  options: { enter?: Listener; leave?: Listener }
) {
  walker.walk(
    root as any,
    options as { enter?: walker.WalkerListener; leave?: walker.WalkerListener }
  );
}

export type Report = {
  // The node at which the rule triggered.
  node: estree.Node;
  // Some human-readable string corresponding to what exactly happened.
  checkId: string;
  // Any extra information. Currently not used, but might be useful for debugging.
  extra?: any;
};

// Passed
// it'll also contain information about the source tree, etc.
export class Context {
  private reports: Report[] = [];
  // A rule should call this when it has some kind of finding.
  public report(report: Report) {
    this.reports.push(report);
  }
  public getReports(): ReadonlyArray<Report> {
    return this.reports;
  }
}

export interface Visitor {
  // Generated via editor magic from @types/estree/index.d.ts.
  Identifier?: (node: estree.Identifier) => void;
  Program?: (node: estree.Program) => void;
  EmptyStatement?: (node: estree.EmptyStatement) => void;
  BlockStatement?: (node: estree.BlockStatement) => void;
  ExpressionStatement?: (node: estree.ExpressionStatement) => void;
  IfStatement?: (node: estree.IfStatement) => void;
  LabeledStatement?: (node: estree.LabeledStatement) => void;
  BreakStatement?: (node: estree.BreakStatement) => void;
  ContinueStatement?: (node: estree.ContinueStatement) => void;
  WithStatement?: (node: estree.WithStatement) => void;
  SwitchStatement?: (node: estree.SwitchStatement) => void;
  ReturnStatement?: (node: estree.ReturnStatement) => void;
  ThrowStatement?: (node: estree.ThrowStatement) => void;
  TryStatement?: (node: estree.TryStatement) => void;
  WhileStatement?: (node: estree.WhileStatement) => void;
  DoWhileStatement?: (node: estree.DoWhileStatement) => void;
  ForStatement?: (node: estree.ForStatement) => void;
  ForInStatement?: (node: estree.ForInStatement) => void;
  DebuggerStatement?: (node: estree.DebuggerStatement) => void;
  FunctionDeclaration?: (node: estree.FunctionDeclaration) => void;
  VariableDeclaration?: (node: estree.VariableDeclaration) => void;
  VariableDeclarator?: (node: estree.VariableDeclarator) => void;
  ThisExpression?: (node: estree.ThisExpression) => void;
  ArrayExpression?: (node: estree.ArrayExpression) => void;
  ObjectExpression?: (node: estree.ObjectExpression) => void;
  Property?: (node: estree.Property) => void;
  FunctionExpression?: (node: estree.FunctionExpression) => void;
  SequenceExpression?: (node: estree.SequenceExpression) => void;
  UnaryExpression?: (node: estree.UnaryExpression) => void;
  BinaryExpression?: (node: estree.BinaryExpression) => void;
  AssignmentExpression?: (node: estree.AssignmentExpression) => void;
  UpdateExpression?: (node: estree.UpdateExpression) => void;
  LogicalExpression?: (node: estree.LogicalExpression) => void;
  ConditionalExpression?: (node: estree.ConditionalExpression) => void;
  // A bit weird since the estree package's CallExpression type includes both
  // call expressions and new expressions.
  CallExpression?: (node: estree.SimpleCallExpression) => void;
  NewExpression?: (node: estree.NewExpression) => void;
  MemberExpression?: (node: estree.MemberExpression) => void;
  Literal?: (node: estree.Literal) => void;
  SwitchCase?: (node: estree.SwitchCase) => void;
  CatchClause?: (node: estree.CatchClause) => void;
  ForOfStatement?: (node: estree.ForOfStatement) => void;
  Super?: (node: estree.Super) => void;
  SpreadElement?: (node: estree.SpreadElement) => void;
  ArrowFunctionExpression?: (node: estree.ArrowFunctionExpression) => void;
  YieldExpression?: (node: estree.YieldExpression) => void;
  TemplateLiteral?: (node: estree.TemplateLiteral) => void;
  TaggedTemplateExpression?: (node: estree.TaggedTemplateExpression) => void;
  TemplateElement?: (node: estree.TemplateElement) => void;
  ObjectPattern?: (node: estree.ObjectPattern) => void;
  ArrayPattern?: (node: estree.ArrayPattern) => void;
  RestElement?: (node: estree.RestElement) => void;
  AssignmentPattern?: (node: estree.AssignmentPattern) => void;
  ClassBody?: (node: estree.ClassBody) => void;
  MethodDefinition?: (node: estree.MethodDefinition) => void;
  ClassDeclaration?: (node: estree.ClassDeclaration) => void;
  ClassExpression?: (node: estree.ClassExpression) => void;
  MetaProperty?: (node: estree.MetaProperty) => void;
  ImportDeclaration?: (node: estree.ImportDeclaration) => void;
  ImportSpecifier?: (node: estree.ImportSpecifier) => void;
  ImportDefaultSpecifier?: (node: estree.ImportDefaultSpecifier) => void;
  ImportNamespaceSpecifier?: (node: estree.ImportNamespaceSpecifier) => void;
  ExportNamedDeclaration?: (node: estree.ExportNamedDeclaration) => void;
  ExportSpecifier?: (node: estree.ExportSpecifier) => void;
  ExportDefaultDeclaration?: (node: estree.ExportDefaultDeclaration) => void;
  ExportAllDeclaration?: (node: estree.ExportAllDeclaration) => void;
  AwaitExpression?: (node: estree.AwaitExpression) => void;

  // This exists for nodes whose name we forgot about. We can't give this the
  // actual type (node: estree.Node) => void because the type has to unify with
  // all the explicitly declared member types.
  [nodeName: string]: any;
}

export interface Rule {
  create: (context: Context) => Visitor;
}

export function runRules(
  ast: estree.Node,
  rules: ReadonlyArray<Rule>,
  context: Context = new Context()
): Context {
  const visitors = rules.map(rule => rule.create(context));
  walk(ast, {
    enter(walkerNode) {
      const node = walkerNode as estree.Node;
      for (const visitor of visitors) {
        const nodeType = node.type as keyof Visitor;
        // Morally, handler has the type `undefined | (node: estree.nodeType) =>
        // void`, but we can't express that.
        const handler = visitor[nodeType];
        if (handler) {
          handler(node as any);
        }
      }
    }
  });
  return context;
}
