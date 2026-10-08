export type Project = {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};
