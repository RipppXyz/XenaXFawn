import fs from "node:fs";
import path from "node:path";

export class Runtime {
  constructor() {
    this.variables = new Map();
    this.functions = new Map();
    this.modules = new Set();

    this.storageFile = path.resolve(".xena-data.json");
    this.storage = this.loadStorage();
    this.lastValue = undefined;
  }

  loadStorage() {
    if (!fs.existsSync(this.storageFile))
      return {};

    try {
      return JSON.parse(
        fs.readFileSync(this.storageFile, "utf8")
      );
    } catch {
      return {};
    }
  }

  saveStorage() {
    fs.writeFileSync(
      this.storageFile,
      JSON.stringify(this.storage, null, 2)
    );
  }

  resolve(node) {
    if (!node) return "";

    if (
      node.type === "Number" ||
      node.type === "String" ||
      node.type === "Boolean"
    ) {
      return node.value;
    }

    if (node.type === "Identifier") {
      return this.variables.has(node.name)
        ? this.variables.get(node.name)
        : node.name;
    }

    if (node.type === "Binary") {
      const left = Number(this.resolve(node.left));
      const right = Number(this.resolve(node.right));

      if (node.operator === "ditambah") return left + right;
      if (node.operator === "dikurangi") return left - right;
      if (node.operator === "dikali") return left * right;
      if (node.operator === "dibagi") return left / right;
      if (node.operator === "modulo") return left % right;
    }

    return "";
  }

  resolveText(text) {
    return text.replace(
      /\b[A-Za-z_][A-Za-z0-9_]*\b/g,
      name => {
        if (this.variables.has(name))
          return String(this.variables.get(name));

        return name;
      }
    );
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

  condition(node) {
    if (node.type === "Truth")
      return Boolean(this.resolve(node.value));

    if (node.type === "Not")
      return !Boolean(this.resolve(node.value));

    if (node.type === "Comparison") {
      return this.compare(
        this.resolve(node.left),
        this.resolve(node.right),
        node.operator
      );
    }

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

        case "VariableCall": {
          const fn = this.functions.get(node.function);

          if (!fn)
            throw new Error(
              `Fungsi ${node.function} tidak ditemukan`
            );

          const old = new Map(this.variables);

          fn.parameters.forEach((parameter, i) => {
            this.variables.set(
              parameter,
              this.resolve(node.arguments[i])
            );
          });

          const result = this.execute(fn.body);
          this.variables = old;

          if (!result?.returned)
            throw new Error(
              `Fungsi ${node.function} tidak mengembalikan nilai`
            );

          this.variables.set(node.name, result.value);
          break;
        }

        case "Send": {
          const value = node.value;

          if (
            value.type === "Identifier" &&
            this.variables.has(value.name)
          ) {
            console.log(this.variables.get(value.name));
          } else {
            console.log(
              this.resolveText(
                value.type === "String"
                  ? value.value
                  : value.name ?? this.resolve(value)
              )
            );
          }

          break;
        }

        case "Expression":
          this.lastValue = this.resolve(node.expression);
          console.log(this.lastValue);
          break;

        case "If": {
          const result = this.condition(node.condition);

          if (result) {
            const output = this.execute(node.body);

            if (output?.returned)
              return output;
          } else if (node.elseBody?.length) {
            const output = this.execute(node.elseBody);

            if (output?.returned)
              return output;
          }

          break;
        }

        case "Loop":
          for (
            let i = 0;
            i < Number(this.resolve(node.count));
            i++
          ) {
            const output = this.execute(node.body);

            if (output?.returned)
              return output;
          }

          break;

        case "Function":
          this.functions.set(node.name, node);
          break;

        case "Return":
          return {
            returned: true,
            value: this.resolve(node.value)
          };

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

          const result = this.execute(fn.body);
          this.variables = old;

          if (result?.returned)
            return result;

          break;
        }

        case "Import":
          this.modules.add(node.name);
          console.log(`Modul ${node.name} dimasukkan`);
          break;

        case "Save":
          if (!this.variables.has(node.name))
            throw new Error(
              `Variabel ${node.name} tidak ditemukan`
            );

          this.storage[node.name] =
            this.variables.get(node.name);

          this.saveStorage();
          break;

        case "Get":
          if (!(node.name in this.storage))
            throw new Error(
              `Data ${node.name} tidak ditemukan`
            );

          this.variables.set(
            node.name,
            this.storage[node.name]
          );

          break;

        case "Run":
          console.log("Xena berjalan.");
          break;
      }
    }
  }
}
