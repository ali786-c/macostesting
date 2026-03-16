export interface PostData {
  text: string;
  location: string;
  music: string;
  scheduledDate: string;
  scheduledTime: string;
  status: 'draft' | 'saved' | 'scheduled';
}

export interface FeedCell {
  id: number;
  image: string | null;
  imageId?: string; // ID de la photo depuis le backend
  postData: PostData;
}

export interface Campaign {
  id: string;
  name: string;
  scheduledPublicationDate: string; // Date prévue de publication
  createdAt: string;
  photoLibrary: string[]; // URLs des photos (pour affichage)
  photoIds: string[]; // IDs des photos depuis le backend
  feedGrid: FeedCell[];
  creatorId: string;
}

