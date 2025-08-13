// /models/Image.ts
import mongoose, { Schema, Document, models } from 'mongoose';

export interface IImage extends Document {
  userId: string;
  cloudinaryUrl: string;
  status: 'processing' | 'complete' | 'failed';
  metadata: Record<string, any>;
  size: number;
  link?: string; // NEW: Optional link field
  createdAt: Date;
}

const ImageSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  cloudinaryUrl: { type: String, required: true },
  status: {
    type: String,
    enum: ['processing', 'complete', 'failed'],
    default: 'processing',
  },
  metadata: { type: Object, default: {} },
  size: { type: Number, required: true, default: 0 },
  link: { type: String }, // NEW: Field added to the schema
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 10800,
  },
});

const Image = models.Image || mongoose.model<IImage>('Image', ImageSchema);

export default Image;