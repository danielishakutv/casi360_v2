import { AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="card animate-in">
      <div className="card-body">
        <div className="page-placeholder">
          <div className="page-placeholder-icon">
            <AlertTriangle size={32} />
          </div>
          <h3>Page Not Found</h3>
          <p>The page you're looking for doesn't exist or has been moved.</p>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: '20px',
              padding: '10px 24px',
              background: 'var(--primary)',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              border: 'none',
              transition: 'var(--transition)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'var(--primary-dark)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'var(--primary)')}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
