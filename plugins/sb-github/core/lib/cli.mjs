// Imported for its side effect by every script (directly, or through project.mjs).
//
// A skill reads a script's output through a pipe. On some platforms (macOS and Windows with Node 20)
// a pipe is written asynchronously, so a script that calls process.exit() right after a large
// console.log loses everything past the first 8 KB. Blocking writes make every byte reach the reader
// before the process exits.
for (const stream of [process.stdout, process.stderr]) stream._handle?.setBlocking?.(true);
