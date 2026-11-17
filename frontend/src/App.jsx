import { Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Report from './pages/Report';
import Messages from './pages/Messages';
import Callback from './pages/Callback';
import NotFound from './pages/NotFound';

export default function App() {
  const { pathname } = useLocation();
  const bare = ['/login', '/register'].includes(pathname); // auth pages have no navbar/footer (as before)
  return (
    <>
      {!bare && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!bare && <Footer />}
    </>
  );
}
