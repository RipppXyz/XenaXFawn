function value(text) {
  text = text.trim();

  if (/^-?\d+(\.\d+)?$/.test(text))
    return { type: "Number", value: Number(text) };

  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  )
    return { type: "String", value: text.slice(1, -1) };

  return { type: "Identifier", name: text };
}

function condition(text) {
  const operators = [
    "lebih dari atau sama dengan",
    "kurang dari atau sama dengan",
    "sama dengan",
    "beda dengan",
    "lebih dari",
    "kurang dari"
  ];

  for (const operator of operators) {
    const marker = ` ${operator} `;
    const index = text.indexOf(marker);

    if (index !== -1) {
      return {
        type: "Comparison",
        operator,
        left: value(text.slice(0, index)),
        right: value(text.slice(index + marker.length))
      };
    }
  }

  throw new Error("Kondisi tidak valid");
}

function parseLine(line) {
  const text = line.text;

  if (text.startsWith("buat ")) {
    const match = text.match(/^buat (.+?) = (.+)$/);

    if (!match)
      throw new Error(`Baris ${line.line}: format buat salah`);

    return {
      type: "Variable",
      name: match[1].trim(),
      value: value(match[2])
    };
  }

  if (text.startsWith("kirim ")) {
    return {
      type: "Send",
      value: value(text.slice(6))
    };
  }

  if (text === "kalau tidak") {
    return {
      type: "Else",
      body: []
    };
  }

  if (text.startsWith("kalau ")) {
    return {
      type: "If",
      condition: condition(text.slice(6)),
      body: [],
      elseBody: []
    };
  }

  if (text.startsWith("ulang ") && text.endsWith(" kali")) {
    return {
      type: "Loop",
      count: value(text.slice(6, -5).trim()),
      body: []
    };
  }

  if (text.startsWith("fungsi ")) {
    const parts = text.slice(7).trim().split(/\s+/);

    return {
      type: "Function",
      name: parts.shift(),
      parameters: parts,
      body: []
    };
  }

  if (text.startsWith("masukin ")) {
    return {
      type: "Import",
      name: text.slice(8).trim()
    };
  }

  if (text === "jalankan") {
    return { type: "Run" };
  }

  const call = text.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(.*)$/);

  if (call && call[2]) {
    return {
      type: "Call",
      name: call[1],
      arguments: call[2].split(/\s+/).map(value)
    };
  }

  return {
    type: "Expression",
    expression: value(text)
  };
}

export function parse(lines) {
  const root = [];
  const stack = [{ indent: -1, body: root }];

  for (const line of lines) {
    while (
      stack.length > 1 &&
      line.indent <= stack[stack.length - 1].indent
    ) {
      stack.pop();
    }

    const current = stack[stack.length - 1];
    const node = parseLine(line);

    if (node.type === "Else") {
      const parent = current.body[current.body.length - 1];

      if (!parent || parent.type !== "If")
        throw new Error(`Baris ${line.line}: kalau tidak harus setelah kalau`);

      stack.push({
        indent: line.indent,
        body: parent.elseBody
      });

      continue;
    }

    current.body.push(node);

    if (
      node.type === "If" ||
      node.type === "Loop" ||
      node.type === "Function"
    ) {
      stack.push({
        indent: line.indent,
        body: node.body
      });
    }
  }

  return {
    type: "Program",
    body: root
  };
}
