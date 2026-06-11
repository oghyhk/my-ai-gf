import { Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import ChatPage from './pages/ChatPage';
import MomentsPage from './pages/MomentsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <div className="h-full flex flex-col bg-wechat-bg">
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/moments" element={<MomentsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
      <Navigation />
    </div>
  );
}
