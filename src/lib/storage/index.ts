import { localDriver } from './local.driver.js';
import type { StorageDriver } from './types.js';


// STORAGE_DRIVER only allows 'local' for now; a Cloudinary driver plugs in here.
export const storage: StorageDriver = localDriver;
