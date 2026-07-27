import ErrorBoundary from './components/ErrorBoundary'
import DueDiligenceDashboard from './pages/DueDiligenceDashboard'

export default function App() {
  return (
    <ErrorBoundary label="dashboard">
      <DueDiligenceDashboard />
    </ErrorBoundary>
  )
}
