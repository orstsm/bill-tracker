import React, { Component } from 'react';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'grid',
            placeItems: 'center',
            padding: '24px 16px',
            background: 'var(--bg, #000)',
            color: 'var(--text, #fff)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
          }}
        >
          <div
            style={{
              width: 'min(100%, 420px)',
              background: 'color-mix(in srgb, var(--surface, #1c1c1e) 85%, transparent)',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
              borderRadius: 24,
              padding: '32px 24px',
              textAlign: 'center',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)',
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                margin: '0 auto 18px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                background: 'color-mix(in srgb, var(--danger, #ff453a) 15%, transparent)',
                color: 'var(--danger, #ff453a)',
              }}
            >
              <AlertTriangle size={32} />
            </div>

            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                margin: '0 0 8px',
                letterSpacing: '-0.02em',
              }}
            >
              Something went wrong
            </h1>

            <p
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: 'var(--text-muted, #8e8e93)',
                margin: '0 0 24px',
              }}
            >
              An unexpected error occurred while displaying the application. Your database records in Supabase remain safe.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                className="primary-button"
                onClick={this.handleReload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  margin: 0,
                }}
              >
                <RotateCcw size={16} />
                Reload App
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  borderRadius: 13,
                  fontSize: 14,
                  fontWeight: 600,
                  background: 'color-mix(in srgb, var(--danger, #ff453a) 12%, transparent)',
                  color: 'var(--danger, #ff453a)',
                  border: '1px solid color-mix(in srgb, var(--danger, #ff453a) 25%, transparent)',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s ease',
                }}
              >
                <Trash2 size={15} />
                Clear Local Cache & Reload
              </button>
            </div>

            {this.state.error?.message && (
              <div style={{ marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted, #8e8e93)',
                    fontSize: 12,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {this.state.showDetails ? 'Hide details' : 'Show technical error'}
                </button>

                {this.state.showDetails && (
                  <pre
                    style={{
                      marginTop: 10,
                      padding: 12,
                      borderRadius: 10,
                      background: 'rgba(0, 0, 0, 0.4)',
                      color: 'var(--text-muted, #8e8e93)',
                      fontSize: 11,
                      textAlign: 'left',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {this.state.error.message}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
