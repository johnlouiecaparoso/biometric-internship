import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { DisplaySettingsProvider } from './context/DisplaySettingsContext';
import { NotificationsProvider } from './context/NotificationsContext';

export default function App() {
  return (
    <AuthProvider>
      <DisplaySettingsProvider>
        <NotificationsProvider>
          <RouterProvider router={router} />
        </NotificationsProvider>
      </DisplaySettingsProvider>
    </AuthProvider>
  );
}
