import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requireAuth = false, 
  requireAdmin = false 
}: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return; // Wait for auth state to load

    // Check authentication requirement
    if (requireAuth && !user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to access this page.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    // Check admin requirement
    if (requireAdmin && (!user || userRole !== 'admin')) {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access this page.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }
  }, [user, userRole, loading, requireAuth, requireAdmin, navigate, toast]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated/authorized
  if (requireAuth && !user) return null;
  if (requireAdmin && (!user || userRole !== 'admin')) return null;

  return <>{children}</>;
};