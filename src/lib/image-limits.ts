// Shared with client components (AddTodoSheet, ImageGallery, DiaryEditor) for
// client-side compression, so it can't live in image-store.ts — that file
// pulls in node:fs and @vercel/blob, which can't be bundled into the client.
// Static photos/PNGs over this get downscaled+re-encoded client-side
// (see image-compress.ts) before upload, so this mostly only bounds
// animated GIFs, which are left untouched to keep their animation.
// 4MB stays under Vercel's ~4.5MB serverless request-body cap.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
