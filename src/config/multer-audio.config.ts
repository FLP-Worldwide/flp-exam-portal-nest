import { diskStorage } from 'multer';
import { extname } from 'path';

export const audioMulterConfig = {
  storage: diskStorage({
    destination: './uploads/audio',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      const safeName = file.originalname.replace(/\s+/g, '-');
      cb(null, `${uniqueSuffix}-${safeName}${ext}`);
    },
  }),
};




// import { diskStorage } from 'multer';
// import { extname } from 'path';
// import type { MulterOptions } from '@nestjs/platform-express';

// export const audioMulterConfig: MulterOptions = {
//   storage: diskStorage({
//     destination: './uploads/audio', 
//     filename: (req, file, cb) => {
//       const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//       const ext = extname(file.originalname);

//       const baseName = file.originalname
//         .replace(ext, '')
//         .replace(/\s+/g, '-');

//       cb(null, `${uniqueSuffix}-${baseName}${ext}`);
//     },
//   }),

//   limits: {
//     fileSize: 20 * 1024 * 1024, 
//   },

//   fileFilter: (req, file, cb) => {
//     if (!file.mimetype.startsWith('audio/')) {
//       return cb(new Error('Only audio files are allowed'), false);
//     }
//     cb(null, true);
//   },
// };
