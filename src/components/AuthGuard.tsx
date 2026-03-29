import { Navigate, useLocation } from 'react-router-dom';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const userStr = localStorage.getItem('solvicaUser');
    
    if (!userStr || userStr === 'null') {
        // Redirect to Landing Page but save the requested location
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
