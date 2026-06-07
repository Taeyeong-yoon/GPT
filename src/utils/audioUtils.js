/** Blob → base64 문자열 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** 녹음 blob이 너무 짧으면(1초 미만) true */
export function isTooShort(blob, minBytes = 4000) {
  return blob.size < minBytes;
}
