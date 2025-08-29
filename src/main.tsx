import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Shell from '@/shell/Shell'
import Dashboard from '@/pages/Dashboard'
import KanalKontrolBotu from '@/pages/KanalKontrolBotu'

const router = createBrowserRouter([
  { path: '/', element: <Shell />, children: [
    { index: true, element: <Dashboard /> },
    { path: 'kanal-kontrol-botu', element: <KanalKontrolBotu /> },
  ] }
])

createRoot(document.getElementById('root')!).render(
  <StrictMode><RouterProvider router={router} /></StrictMode>
)
