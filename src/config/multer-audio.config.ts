// src/config/multer-audio.config.ts
import { diskStorage } from 'multer';
import { extname } from 'path';

export const audioMulterConfig = {
  storage: diskStorage({
    destination: './uploads/audio', // folder relative to project root
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      const safeName = file.originalname.replace(/\s+/g, '-');
      cb(null, `${uniqueSuffix}-${safeName}${ext}`);
    },
  }),
};
