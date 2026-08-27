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
