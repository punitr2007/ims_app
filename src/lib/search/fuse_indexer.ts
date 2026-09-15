import Fuse, { IFuseOptions } from 'fuse.js';
import { Notice } from '../ims/types';

const FUSE_OPTIONS: IFuseOptions<Notice> = {
  keys: [
    { name: 'title', weight: 0.6 },
    { name: 'department', weight: 0.25 },
    { name: 'publisher', weight: 0.1 },
    { name: 'publishedDate', weight: 0.05 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

export function createNoticeIndex(notices: Notice[]) {
  return new Fuse(notices, FUSE_OPTIONS);
}
