import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (!user.isVerified) return <Navigate to="/verify-email-pending" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/livechat" />;
  return children;
}