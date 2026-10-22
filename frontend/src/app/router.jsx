import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import HomePage from '../pages/HomePage';
import FreeMoviesPage from '../pages/FreeMoviesPage';
import DiscoverPage from '../pages/DiscoverPage';
import CreateRoomPage from '../pages/CreateRoomPage';
import WatchRoomPage from '../pages/WatchRoomPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import ProfilePage from '../pages/ProfilePage';
import OnboardingPage from '../pages/OnboardingPage';
import FriendsPage from '../pages/FriendsPage';
import ProtectedRoute from '../components/auth/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'onboarding',
        element: (
          <ProtectedRoute allowUnboarded={true}>
            <OnboardingPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'free-movies',
        element: (
          <ProtectedRoute>
            <FreeMoviesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'discover',
        element: (
          <ProtectedRoute>
            <DiscoverPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'create-room',
        element: (
          <ProtectedRoute>
            <CreateRoomPage initialTab="create" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'join-room',
        element: (
          <ProtectedRoute>
            <CreateRoomPage initialTab="join" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rooms/:roomCode',
        element: (
          <ProtectedRoute>
            <WatchRoomPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'signup',
        element: <RegisterPage />,
      },
      {
        path: 'reset-password',
        element: <ResetPasswordPage />,
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'friends',
        element: (
          <ProtectedRoute>
            <FriendsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: (
          <div className="container" style={{ padding: 'var(--space-20) 0', textAlign: 'center' }}>
            <h1 style={{ fontSize: 'var(--text-4xl)', marginBottom: 'var(--space-4)' }}>404 - Room Not Found</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              The page or movie room you are looking for does not exist or has been closed.
            </p>
          </div>
        ),
      },
    ],
  },
]);

export default router;
