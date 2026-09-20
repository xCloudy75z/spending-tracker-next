export default async function* nativeJsonReporter(source) {
  for await (const event of source) yield `${JSON.stringify(event)}\n`;
}
