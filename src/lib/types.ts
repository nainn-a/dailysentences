export type TodoDTO = {
  id: string;
  date: string;
  time: string;
  text: string;
  done: boolean;
  createdAt: string;
  imageId?: string;
  imageUrl?: string;
  parentId?: string;
  categoryColor?: string;
  // Set when `done` flips to true (and cleared if it flips back), so a
  // consumer can show when a todo was actually finished, not just that it
  // is. See update() in store.ts.
  completedAt?: string;
  // Set on delete instead of actually removing the row, so a mistaken
  // delete can be undone. Never appears in a normal listing — see
  // readAllFresh() in store.ts — only in the 휴지통 (trash) view.
  deletedAt?: string;
};

export type ImageDTO = {
  id: string;
  url: string;
  uploadedAt: string;
};

export type DiaryImage = {
  id: string;
  url: string;
};

export type DiaryDTO = {
  date: string;
  content: string;
  images: DiaryImage[];
  updatedAt: string;
};
