import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Worker MSW chạy trong trình duyệt — chỉ bật ở môi trường dev khi cần mock. */
export const worker = setupWorker(...handlers);
