export type TodoDTO = {
  id: string;
  date: string;
  time: string;
  text: string;
  done: boolean;
  createdAt: string;
  imageId?: string;
  imageUrl?: string;
};

export type ImageDTO = {
  id: string;
  url: string;
  uploadedAt: string;
};
