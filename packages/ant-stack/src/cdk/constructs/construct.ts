import {
  Construct as OriginalConstruct,
  Node as OriginalNode,
  Dependable,
  type IConstruct,
} from "constructs";

const CONSTRUCT_SYM = Symbol.for("constructs.Construct");

export class Node extends OriginalNode {
  public constructor(host: OriginalConstruct, scope: IConstruct, id: string) {
    super(host, scope, id);
  }

  public setKleinContext(key: string, value: any) {
    this.setContext(key, value);
  }

  public getKleinContext(key: string): any {
    return this.getContext(key);
  }
}

/**
 * Represents the building block of the construct graph.
 *
 * All constructs besides the root construct must be created within the scope of
 * another construct.
 */
export class Construct implements IConstruct {
  /**
   * Checks if `x` is a construct.
   *
   * Use this method instead of `instanceof` to properly detect `Construct`
   * instances, even when the construct library is symlinked.
   *
   * Explanation: in JavaScript, multiple copies of the `constructs` library on
   * disk are seen as independent, completely different libraries. As a
   * consequence, the class `Construct` in each copy of the `constructs` library
   * is seen as a different class, and an instance of one class will not test as
   * `instanceof` the other class. `npm install` will not create installations
   * like this, but users may manually symlink construct libraries together or
   * use a monorepo tool: in those cases, multiple copies of the `constructs`
   * library can be accidentally installed, and `instanceof` will behave
   * unpredictably. It is safest to avoid using `instanceof`, and using
   * this type-testing method instead.
   *
   * @returns true if `x` is an object created from a class which extends `Construct`.
   * @param x Any object
   */
  public static isConstruct(x: any): x is Construct {
    return x && typeof x === "object" && x[CONSTRUCT_SYM];
  }

  /**
   * The tree node.
   */
  public readonly node: Node;

  /**
   * Creates a new construct node.
   *
   * @param scope The scope in which to define this construct
   * @param id The scoped construct ID. Must be unique amongst siblings. If
   * the ID includes a path separator (`/`), then it will be replaced by double
   * dash `--`.
   */
  constructor(scope: Construct, id: string) {
    this.node = new Node(this, scope, id);

    // implement IDependable privately
    Dependable.implement(this, {
      dependencyRoots: [this],
    });
  }

  /**
   * Returns a string representation of this construct.
   */
  public toString() {
    return this.node.path || "<root>";
  }
}

/**
 * Implement this interface in order for the construct to be able to validate itself.
 */
export interface IValidation {
  /**
   * Validate the current construct.
   *
   * This method can be implemented by derived constructs in order to perform
   * validation logic. It is called on all constructs before synthesis.
   *
   * @returns An array of validation error messages, or an empty array if there the construct is valid.
   */
  validate(): string[];
}

/**
 * In what order to return constructs
 */
export enum ConstructOrder {
  /**
   * Depth-first, pre-order
   */
  PREORDER,

  /**
   * Depth-first, post-order (leaf nodes first)
   */
  POSTORDER,
}

/**
 * Options for `construct.addMetadata()`.
 */
export interface MetadataOptions {
  /**
   * Include stack trace with metadata entry.
   * @default false
   */
  readonly stackTrace?: boolean;

  /**
   * A JavaScript function to begin tracing from.
   *
   * This option is ignored unless `stackTrace` is `true`.
   *
   * @default addMetadata()
   */
  readonly traceFromFunction?: any;
}

// Mark all instances of 'Construct'
Object.defineProperty(Construct.prototype, CONSTRUCT_SYM, {
  value: true,
  enumerable: false,
  writable: false,
});
