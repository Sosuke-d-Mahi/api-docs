import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CodeExample({ method, path, params }) {
    const { user } = useAuth();
    const [selectedLang, setSelectedLang] = useState('curl');
    const [copied, setCopied] = useState(false);

    const apiKey = user?.apikey || 'YOUR_API_KEY';
    const baseUrl = window.location.origin;
    
    // Add apikey to query params
    const queryParts = params?.filter(p => !path.includes(`:${p.name}`)).map(p => `${p.name}=YOUR_${p.name.toUpperCase()}`) || [];
    queryParts.push(`apikey=${apiKey}`);
    
    const queryParams = queryParts.join('&');
    const fullPath = `${path}?${queryParams}`;
    const fullUrl = `${baseUrl}${fullPath}`;

    const generateCode = (lang) => {
        switch (lang) {
            case 'curl':
                return `curl -X ${method.toUpperCase()} "${fullUrl}"`;
            case 'javascript':
                return `const axios = require('axios');\n\naxios.${method.toLowerCase()}('${fullUrl}')\n  .then(response => {\n    console.log(response.data);\n  })\n  .catch(error => {\n    console.error(error);\n  });`;
            case 'python':
                return `import requests\n\nresponse = requests.${method.toLowerCase()}('${fullUrl}')\nprint(response.json())`;
            default:
                return '';
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generateCode(selectedLang));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const languages = [
        { id: 'curl', name: 'cURL' },
        { id: 'javascript', name: 'JavaScript' },
        { id: 'python', name: 'Python' }
    ];

    return (
        <div className="bg-black/40 rounded-lg border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
                <div className="flex gap-4">
                    {languages.map(lang => (
                        <button
                            key={lang.id}
                            onClick={() => setSelectedLang(lang.id)}
                            className={`text-xs font-medium transition-colors ${selectedLang === lang.id ? 'text-purple-400 border-b-2 border-purple-400 pb-1 -mb-[9px]' : 'text-slate-400 hover:text-white'}`}
                        >
                            {lang.name}
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-white"
                    title="Copy to clipboard"
                >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
            </div>
            <div className="p-4 overflow-x-auto">
                <pre className="text-xs font-mono text-purple-200 leading-relaxed">
                    {generateCode(selectedLang)}
                </pre>
            </div>
        </div>
    );
}
