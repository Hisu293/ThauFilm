/** Hash ổn định kiểu Java — dùng làm id phụ cho poster/path */
export function hashCode(input = '') {
  const str = String(input);
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function hashFilmAsset(fileName) {
  const path = `/listfilm/${fileName}`;
  return hashCode(path);
}

export function filmIndexFromFile(fileName) {
  const match = String(fileName).match(/film(\d+)/i);
  return match ? Number(match[1]) : null;
}
