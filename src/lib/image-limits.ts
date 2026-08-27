// Shared with client components (AddTodoSheet, ImageGallery, DiaryEditor) for
// client-side compression, so it can't live in image-store.ts — that file
// pulls in node:fs and @vercel/blob, which can't be bundled into the client.
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // stays well under Vercel's ~4.5MB serverless request-body cap
