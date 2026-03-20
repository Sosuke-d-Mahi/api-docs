import { useState } from 'react';
import axios from 'axios';
import { Play, Loader2, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ApiTester({ method, path, params }) {
    const { user } = useAuth();
    const [inputs, setInputs] = useState({});
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState(null);
    const [error, setError] = useState(null);

    const apiKey = user?.apikey;

    const handleInputChange = (name, value) => {
        setInputs(prev => ({ ...prev, [name]: value }));
    };

    const handleExecute = async () => {
        setLoading(true);
        setResponse(null);
        setError(null);

        try {
            let fullPath = path;
            const queryParams = [];

            params?.forEach(p => {
                const val = inputs[p.name] || '';
                if (path.includes(`:${p.name}`)) {
                    fullPath = fullPath.replace(`:${p.name}`, encodeURIComponent(val));
                } else if (val) {
                    queryParams.push(`${p.name}=${encodeURIComponent(val)}`);
                }
            });

            if (apiKey) {
                queryParams.push(`apikey=${apiKey}`);
            }

            if (queryParams.length > 0) {
                fullPath += `${fullPath.includes('?') ? '&' : '?'}${queryParams.join('&')}`;
            }

            const res = await axios({
                method: method.toLowerCase(),
                url: fullPath,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            setResponse({
                status: res.status,
                data: res.data
            });
        } catch (err) {
            console.error(err);
            setError({
                status: err.response?.status || 'Error',
                message: err.response?.data?.message || err.message || 'Execution Failed'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-black/20 p-4 rounded-lg border border-white/10">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Parameters</h4>
                <div className="grid gap-4">
                    {params?.map(p => (
                        <div key={p.name} className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-purple-300">
                                {p.name} {p.required && <span className="text-red-400">*</span>}
                            </label>
                            <input
                                type="text"
                                placeholder={p.description}
                                className="bg-black/40 border border-white/5 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
                                onChange={(e) => handleInputChange(p.name, e.target.value)}
                            />
                        </div>
                    ))}
                    {!params?.length && <p className="text-xs text-slate-500 italic">No parameters required</p>}
                </div>
                
                {!apiKey && (
                    <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-3">
                        <AlertCircle size={16} className="text-amber-400" />
                        <p className="text-[11px] text-amber-200/80">
                            No API Key found. You are testing as an unauthenticated user.
                        </p>
                    </div>
                )}

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleExecute}
                        disabled={loading}
                        className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/50 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2 transition-colors shadow-lg shadow-purple-900/20"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                        Execute
                    </button>
                </div>
            </div>

            {(response || error) && (
                <div className="bg-black/40 rounded-lg border border-white/10 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Response</span>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${error ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                STATUS: {error ? error.status : response.status}
                            </span>
                            <button onClick={() => { setResponse(null); setError(null); }} className="text-slate-400 hover:text-white">
                                <XCircle size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="p-4 max-h-[300px] overflow-y-auto">
                        <pre className={`text-xs font-mono leading-relaxed ${error ? 'text-red-400' : 'text-purple-200'}`}>
                            {JSON.stringify(error ? error : response.data, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}
