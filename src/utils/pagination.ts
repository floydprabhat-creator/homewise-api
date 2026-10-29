import { PAGE_SIZE } from '../config/constants.js';

export function pageToOffset(page: number) {
  return { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
}
