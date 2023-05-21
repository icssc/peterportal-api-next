export type NodeType = "?" | "&" | "|" | "#";

export class Node {
  constructor(public type: NodeType = "?", public values: Node[] = []) {}
  collapse() {
    switch (this.type) {
      case "#":
        return;
      case "?":
        if (this.values.length === 1 && this.values[0].type != "#") {
          const child = this.values[0];
          this.type = child.type;
          this.values = child.values;
        }
        break;
      default:
        for (const node of this.values) {
          node.collapse();
          if (this.values.length === 1) {
            const child = this.values[0];
            this.type = child.type;
            this.values = child.values;
          } else {
            const newValues = [];
            for (const node of this.values) {
              if (this.type === node.type) {
                newValues.push(...node.values);
              } else {
                newValues.push(node);
              }
            }
            this.values = newValues;
          }
        }
    }
  }
  prereqsMet(classHistory: Node[]): boolean {
    switch (this.type) {
      case "?":
        return this.values[0].prereqsMet(classHistory);
      case "#":
        return classHistory.includes(this.values[0]);
      case "&":
        return this.values.every((x) => x.prereqsMet(classHistory));
      case "|":
        return this.values.some((x) => x.prereqsMet(classHistory));
    }
  }
  includes(value: Node): boolean {
    switch (this.type) {
      case "#":
      case "?":
        return this.values[0] === value;
      case "|":
      case "&":
        return this.values.some((x) => x.includes(value));
    }
  }
  prettyPrint(): string {
    switch (this.type) {
      case "?":
        return this.values[0].prettyPrint();
      case "#":
        return this.values[0].toString();
      case "&": {
        let ret = "( ";
        let count = 0;
        for (const val of this.values) {
          ret += count != 0 ? " AND " : "";
          ret += val.prettyPrint();
          ++count;
        }
        ret += " )";
        return ret;
      }
      case "|": {
        let ret = "( ";
        let count = 0;
        for (const val of this.values) {
          ret += count != 0 ? " OR " : "";
          ret += val.prettyPrint();
          ++count;
        }
        ret += " )";
        return ret;
      }
    }
  }
  toString(): string {
    switch (this.type) {
      case "?":
        return `'{"AND":['${this.values[0].toString()}]}`;
      case "#":
        return `"${this.values[0].toString()}"`;
      case "&": {
        let ret = '{"AND":[';
        let count = 0;
        for (const val of this.values) {
          ret += count != 0 ? "," : "";
          ret += val.toString();
          ++count;
        }
        ret += "]}";
        return ret;
      }
      case "|": {
        let ret = '{"OR":[';
        let count = 0;
        for (const val of this.values) {
          ret += count != 0 ? " OR " : "";
          ret += val.toString();
          ++count;
        }
        ret += "]}";
        return ret;
      }
    }
  }
}

export function nodify(tokens: string[], lookup: Node[], courseNumber: string): Node {
  const stack = [new Node("?")];
  for (const token of tokens) {
    switch (token.toLowerCase()) {
      case "(":
        stack.unshift(new Node());
        break;
      case ")": {
        const subNode = stack.shift() as Node;
        if (subNode.type === "?") {
          subNode.type = "#";
          subNode.values = subNode.values[0].values;
        }
        stack[0].values.push(subNode);
        break;
      }
      case "and":
        if (stack[0].type === "|") {
          console.warn(`Conflicting logic detected in course ${courseNumber}`);
          const subNode = new Node(stack[0].type, [...stack[0].values]);
          stack[0].values = [subNode];
        }
        stack[0].type = "&";
        break;
      case "or":
        if (stack[0].type === "&") {
          console.warn(`Conflicting logic detected in course ${courseNumber}`);
          const subNode = new Node(stack[0].type, [...stack[0].values]);
          stack[0].values = [subNode];
        }
        stack[0].type = "|";
        break;
      default: {
        const newNode = new Node("#");
        newNode.values.push(lookup[parseInt(token, 10)]);
        stack[0].values.push(newNode);
      }
    }
  }
  if (stack.length !== 1) throw new Error("Non-matching parens detected!");
  return stack[0];
}
