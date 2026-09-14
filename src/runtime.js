export class Runtime {
  constructor() {
    this.variables = new Map();
    this.functions = new Map();
    this.modules = new Set();
  }

  resolve(node) {
    if (node.type === "Number" || node.type === "String")
      return node.value;

    if (node.type === "Identifier") {
      return this.variables.has(node.name)
        ? this.variables.get(node.name)
        : node.name;
    }
  }

  compare(a, b, operator) {
    if (operator === "sama dengan") return a == b;
    if (operator === "beda dengan") return a != b;
    if (operator === "lebih dari") return a > b;
    if (operator === "kurang dari") return a < b;
    if (operator === "lebih dari atau sama dengan") return a >= b;
    if (operator === "kurang dari atau sama dengan") return a <= b;

    return false;
  }

  execute(nodes) {
    for (const node of nodes) {
      switch (node.type) {
        case "Variable":
          this.variables.set(
            node.name,
            this.resolve(node.value)
          );
          break;

        case "Send":
        case "Expression":
          console.log(
            this.resolve(node.value ?? node.expression)
          );
          break;

        case "If": {
          const result = this.compare(
            this.resolve(node.condition.left),
            this.resolve(node.condition.right),
            node.condition.operator
          );

          if (result) {
            this.execute(node.body);
          } else if (node.elseBody?.length) {
            this.execute(node.elseBody);
          }

          break;
        }

        case "Loop":
          for (
            let i = 0;
            i < Number(this.resolve(node.count));
            i++
          ) {
            this.execute(node.body);
          }
          break;

        case "Function":
          this.functions.set(node.name, node);
          break;

        case "Call": {
          const fn = this.functions.get(node.name);

          if (!fn)
            throw new Error(
              `Fungsi ${node.name} tidak ditemukan`
            );

          const old = new Map(this.variables);

          fn.parameters.forEach((parameter, i) => {
            this.variables.set(
              parameter,
              this.resolve(node.arguments[i])
            );
          });

          this.execute(fn.body);
          this.variables = old;

          break;
        }

        case "Import":
          this.modules.add(node.name);
          console.log(`Modul ${node.name} dimasukkan`);
          break;

        case "Run":
          console.log("XenaXFawn berjalan.");
          break;
      }
    }
  }
}
