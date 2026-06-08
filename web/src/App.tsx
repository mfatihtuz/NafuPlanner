import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { ProtectedLayout, PublicOnly, RequireAuth } from '@/routes';
import { LoginPage } from '@/routes/LoginPage';
import { CreateGroupPage } from '@/routes/CreateGroupPage';
import { TodayPage } from '@/routes/TodayPage';
import { TasksPage } from '@/routes/TasksPage';
import { ShoppingPage } from '@/routes/ShoppingPage';
import { MorePage } from '@/routes/MorePage';
import { InviteAcceptPage } from '@/routes/InviteAcceptPage';

const router = createBrowserRouter([
  {
    path: '/giris',
    element: (
      <PublicOnly>
        <LoginPage />
      </PublicOnly>
    ),
  },
  {
    // Grup olusturma: oturum gerekir, ama grup gerektirmez (ilk grup burada acilir).
    path: '/grup/yeni',
    element: (
      <RequireAuth>
        <CreateGroupPage />
      </RequireAuth>
    ),
  },
  {
    // Davet onizleme herkese acik; kabul icin giris istenir (sayfa ici).
    path: '/davet/:token',
    element: <InviteAcceptPage />,
  },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'gorevler', element: <TasksPage /> },
      { path: 'alisveris', element: <ShoppingPage /> },
      { path: 'daha', element: <MorePage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
