/* Client-side image compression — shrink big phone photos before upload so they
   use far less storage/bandwidth. Returns a JPEG File; non-images or already-
   small files pass through unchanged. Runs in the browser (uses canvas). */
export async function compressImage(file, { maxDim = 1600, quality = 0.8 } = {}) {
  try {
    if (!file || !file.type || !file.type.startsWith('image/')) return file;
    if (file.type === 'image/gif') return file;            // keep animation
    if (file.size < 150 * 1024) return file;               // <150KB: not worth it

    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result); r.onerror = rej;
      r.readAsDataURL(file);
    });
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i); i.onerror = rej;
      i.src = dataUrl;
    });

    let { width, height } = img;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);

    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;      // compression didn't help

    const base = (file.name || 'photo').replace(/\.[^.]+$/, '');
    return new File([blob], base + '.jpg', { type: 'image/jpeg' });
  } catch (e) {
    return file;   // never block an upload because compression failed
  }
}
