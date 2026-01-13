import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-black text-white p-8 font-mono text-center">
                    <div>
                        <h1 className="text-3xl font-bold text-red-500 mb-4">Frontend Error</h1>
                        <p className="mb-4">Something went wrong while rendering the application.</p>
                        <div className="bg-red-900/20 border border-red-500/30 p-4 rounded text-left text-xs overflow-auto max-w-2xl mx-auto">
                            {this.state.error && this.state.error.toString()}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-6 px-4 py-2 bg-white text-black rounded hover:bg-slate-200"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
