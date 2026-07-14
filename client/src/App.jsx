import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import LiveChat from './pages/LiveChat';
import ProtectedRoute from './components/ProtectedRoute';
import Team from './pages/Team';
import Analytics from './pages/Analytics';
import Billing from './pages/Billing';
import BillingConfirm from './pages/BillingConfirm';
import Start from './pages/Start';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import VerifyEmailPending from './pages/VerifyEmailPending';
import Account from './pages/Account';
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/livechat" element={<ProtectedRoute><LiveChat /></ProtectedRoute>} />
          <Route path="*" element={<Login />} />
          <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
          <Route path="/billing/confirm" element={<ProtectedRoute><BillingConfirm /></ProtectedRoute>} />
          <Route path="/start" element={<Start />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email-pending" element={<VerifyEmailPending />} />
          <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;