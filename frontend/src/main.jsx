import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

const render = () => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
};

// Bật mock API (MSW) khi VITE_ENABLE_MOCK=true — dùng để chạy thử khi chưa có backend.
async function bootstrap() {
  if (import.meta.env.VITE_ENABLE_MOCK === 'true') {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass', // request không khớp handler vẫn đi thẳng ra mạng
    });
  }
  render();
}

bootstrap();
