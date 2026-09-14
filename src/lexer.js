export function lex(source) {
  return source
    .replace(/\r/g, "")
    .split("\n")
    .map((raw, i) => ({
      indent: raw.match(/^ */)?.[0].length ?? 0,
      text: raw.trim(),
      line: i + 1
    }))
    .filter(x => x.text && !x.text.startsWith("#"));
}
