import pako from "pako";

/**
 * Compresses a JSON object into a Base64 encoded Gzip string
 */
export const compressData = (data: any): string => {
  try {
    const jsonString = JSON.stringify(data);
    const compressed = pako.gzip(jsonString);
    // Convert Uint8Array to Binary String
    let binary = "";
    const len = compressed.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(compressed[i]);
    }
    // Convert Binary String to Base64
    return btoa(binary);
  } catch (error) {
    console.error("Compression failed:", error);
    throw error;
  }
};

/**
 * Decompresses a Base64 encoded Gzip string back into a JSON object
 */
export const decompressData = (base64String: string): any => {
  try {
    // Convert Base64 to Binary String
    const binary = atob(base64String);
    // Convert Binary String to Uint8Array
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    // Decompress
    const decompressed = pako.ungzip(bytes, { to: "string" });
    return JSON.parse(decompressed);
  } catch (error) {
    console.error("Decompression failed:", error);
    throw error;
  }
};
