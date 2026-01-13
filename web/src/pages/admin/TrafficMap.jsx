import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Map, Activity } from 'lucide-react';

const TrafficMap = () => {
    const { user } = useAuth();
    const [visits, setVisits] = useState([]);
    const [selectedVisit, setSelectedVisit] = useState(null);

    useEffect(() => {
        const fetchTraffic = async () => {
            try {
                const res = await axios.get('/api/admin/traffic', {
                    headers: { 'x-admin-key': 'easir-secret-key-123' } // Using legacy key as fallback or user key if available
                });
                if (res.data.status) {
                    setVisits(res.data.data);
                    if (res.data.data.length > 0) setSelectedVisit(res.data.data[0]);
                }
            } catch (e) {
                console.error("Failed to load traffic", e);
            }
        };

        fetchTraffic();
        const interval = setInterval(fetchTraffic, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, [user]);

    return (
        <div className="glass-panel p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Map size={18} className="text-blue-500" /> Live Visitor Traffic
                </h3>
            </div>

            <div className="grid md:grid-cols-3 gap-6 h-[400px]">
                {/* Visit List */}
                <div className="md:col-span-1 border-r border-slate-800 pr-4 overflow-y-auto custom-scrollbar">
                    {visits.map((visit, i) => (
                        <div
                            key={i}
                            onClick={() => setSelectedVisit(visit)}
                            className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${selectedVisit === visit ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-slate-800/30 hover:bg-slate-800'}`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-mono text-xs text-slate-400">{visit.ip}</span>
                                <span className="text-xs text-slate-500">{new Date(visit.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className="text-sm font-medium text-white truncate">{visit.city || 'Unknown City'}, {visit.country}</div>
                            <div className="text-xs text-slate-400 truncate">{visit.isp}</div>
                        </div>
                    ))}
                    {visits.length === 0 && <p className="text-slate-500 text-center py-10">No recent visits</p>}
                </div>

                {/* Map View */}
                <div className="md:col-span-2 flex flex-col items-center justify-center bg-slate-900 rounded-lg overflow-hidden relative">
                    {selectedVisit ? (
                        <iframe
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            style={{ border: 0, opacity: 0.8, filter: 'invert(90%) hue-rotate(180deg)' }}
                            src={`https://www.google.com/maps?q=${selectedVisit.lat},${selectedVisit.lon}&output=embed`}
                            allowFullScreen
                        ></iframe>
                    ) : (
                        <div className="text-slate-500 flex flex-col items-center">
                            <Map size={48} className="mb-4 opacity-20" />
                            <p>Select a visitor to view location</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TrafficMap;
