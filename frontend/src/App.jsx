import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Chat from "./pages/Chat.jsx";
import Learn from "./pages/Learn.jsx";
import InstallPrompt from "./components/InstallPrompt.jsx";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  return user ? children : <Navigate to="/login" replace />;
}

function FullScreenLoader() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-midnight-950">
      <div className="h-10 w-10 rounded-full border-2 border-signal-500 border-t-transparent animate-spin" />
    </div>
  );
}

export default function App() {
  const { loading } = useAuth();
  if (loading) return <FullScreenLoader />;

  return (
    <SocketProvider>
      <InstallPrompt />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Chat />
            </PrivateRoute>
          }
        />
        <Route
          path="/learn"
          element={
            <PrivateRoute>
              <Learn />
            </PrivateRoute>
          }
        />
      </Routes>
    </SocketProvider>
  );
}
