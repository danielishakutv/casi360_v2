import { Component } from 'react'

/**
 * ErrorBoundary — catches unhandled errors anywhere inside its subtree
 * and renders a friendly fallback UI instead of a white screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // You can send to a logging service here
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary, #111)' }}>
            Something went wrong
          </h1>
          <p style={{ color: 'var(--text-muted, #666)', marginBottom: '1.5rem', maxWidth: 480 }}>
            An unexpected error occurred. You can try reloading the page or clicking the button below.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={this.handleReset}
              style={{ padding: '0.5rem 1.25rem', borderRadius: 6, border: '1px solid var(--border, #ddd)', background: 'var(--bg-primary, #fff)', cursor: 'pointer', fontWeight: 500 }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '0.5rem 1.25rem', borderRadius: 6, border: 'none', background: 'var(--primary, #4f46e5)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
