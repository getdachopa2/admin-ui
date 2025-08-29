import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './index.css'
import Shell from '@/shell/Shell'
import Dashboard from '@/pages/Dashboard'
import KanalKontrolBotu from '@/pages/KanalKontrolBotu'
import ReactDOM from 'react-dom/client';
import React from 'react';





const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Dashboard /> },

      // ✅ asıl sayfa
      { path: 'kanal-kontrol-botu', element: <KanalKontrolBotu /> },

      // ♻️ eski/yanlış linkleri yeni rotaya yönlendir
      { path: 'kanal-kontrol', element: <Navigate to="/kanal-kontrol-botu" replace /> },
      { path: 'kanal-kontrol-bot', element: <Navigate to="/kanal-kontrol-botu" replace /> },

      // 🧹 diğer her şeyi ana sayfaya at
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
