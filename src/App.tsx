import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { PageErrorBoundary } from './components/layout/PageErrorBoundary';
import { ToastContainer } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Insumos = lazy(() => import('./pages/Insumos').then(m => ({ default: m.Insumos })));
const Productos = lazy(() => import('./pages/Productos').then(m => ({ default: m.Productos })));
const Stock = lazy(() => import('./pages/Stock').then(m => ({ default: m.Stock })));
const Ventas = lazy(() => import('./pages/Ventas').then(m => ({ default: m.Ventas })));
const CostosFijos = lazy(() => import('./pages/CostosFijos').then(m => ({ default: m.CostosFijos })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));

// Loading component
function PageLoader() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        <p className="text-slate-700 dark:text-slate-300 font-medium">Cargando...</p>
      </div>
    </div>
  );
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Navigate to="/dashboard" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <PageErrorBoundary pageName="Dashboard">
                      <Dashboard />
                    </PageErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/insumos"
                element={
                  <ProtectedRoute>
                    <PageErrorBoundary pageName="Insumos">
                      <Insumos />
                    </PageErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/productos"
                element={
                  <ProtectedRoute>
                    <PageErrorBoundary pageName="Productos">
                      <Productos />
                    </PageErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stock"
                element={
                  <ProtectedRoute>
                    <PageErrorBoundary pageName="Stock">
                      <Stock />
                    </PageErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ventas"
                element={
                  <ProtectedRoute>
                    <PageErrorBoundary pageName="Ventas">
                      <Ventas />
                    </PageErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/costos-fijos"
                element={
                  <ProtectedRoute>
                    <PageErrorBoundary pageName="Costos Fijos">
                      <CostosFijos />
                    </PageErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <PageErrorBoundary pageName="Reportes">
                      <Reports />
                    </PageErrorBoundary>
                  </ProtectedRoute>
                }
              />

              {/* Catch all - redirect to dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>

          {/* Global Toast Container */}
          <ToastContainer />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
