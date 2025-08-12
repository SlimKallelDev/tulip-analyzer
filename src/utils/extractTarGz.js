import * as pako from 'pako';

export async function extractTarGz(file) {
  const arrayBuffer = await file.arrayBuffer();

  // Step 1: Gunzip
  const decompressed = pako.ungzip(new Uint8Array(arrayBuffer));

  // Step 2: Untar
  const jsonFiles = [];
  let offset = 0;
  const TAR_BLOCK_SIZE = 512;
  const decoder = new TextDecoder('utf-8');

  while (offset < decompressed.length) {
    const header = decompressed.slice(offset, offset + TAR_BLOCK_SIZE);
    const name = decoder.decode(header.slice(0, 100)).replace(/\0.*$/, '');
    const sizeOctal = decoder.decode(header.slice(124, 136)).replace(/\0.*$/, '');
    const size = parseInt(sizeOctal.trim(), 8);

    if (!name) break; // End of archive

    const contentStart = offset + TAR_BLOCK_SIZE;
    const contentEnd = contentStart + size;
    const content = decompressed.slice(contentStart, contentEnd);

    if (name.endsWith('.json')) {
      try {
        const text = decoder.decode(content);
        const json = JSON.parse(text);
        jsonFiles.push(json);
      } catch (e) {
        console.error(`Failed to parse JSON file ${name}:`, e);
      }
    }

    // Move to next file header (512-byte alignment)
    offset = contentEnd + (TAR_BLOCK_SIZE - (size % TAR_BLOCK_SIZE || TAR_BLOCK_SIZE));
  }

  if (jsonFiles.length === 0) {
    throw new Error("No JSON files found in .tar.gz");
  }

  return jsonFiles;
}
