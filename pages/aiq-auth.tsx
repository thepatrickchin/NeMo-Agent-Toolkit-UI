import React, { useState } from 'react';
import type { FormEvent } from 'react';

interface PromptModalProps {
  onSubmit: (value: string, domain: string) => void;
  initialValue: string;
  initialDomain: string;
}

function PromptModal({ onSubmit, initialValue, initialDomain }: PromptModalProps) {
  const [value, setValue] = useState(initialValue);
  const [domain, setDomain] = useState(initialDomain);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(value, domain);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white dark:bg-[#343541] rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">Enter Authentication Details</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Domain URL
            </label>
            <input
              id="domain"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded mb-4 bg-white dark:bg-[#40414F] text-black dark:text-white"
              placeholder="Enter domain URL..."
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="promptKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Consent Prompt Key
            </label>
            <input
              id="promptKey"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded mb-4 bg-white dark:bg-[#40414F] text-black dark:text-white"
              placeholder="Enter consent prompt key..."
              autoFocus
              autoComplete="off"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-[#76b900] text-white rounded hover:bg-[#5a9100] focus:outline-none transition-colors duration-200"
            >
              Send Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AIQAuthPage() {
  const [showPrompt, setShowPrompt] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<any>(null);
  const [modalKey, setModalKey] = useState(0);

  const handleSubmit = async (key: string, domain: string) => {
    setIsProcessing(true);
    setError(null);
    setResponseError(null);
    setResponseData(null);
    
    try {
      const response = await fetch(`${domain}/auth/prompt-uri`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ "consent_prompt_key": key }),
      });

      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        setResponseData(data);
        
        if (!response.ok) {
          const errorMessage = data.message || data.error || `Error: ${response.status} - ${response.statusText}`;
          setResponseError(errorMessage);
          return;
        }

        if (data.redirect_url) {
          window.location.href = data.redirect_url;
          return;
        }
      }

      if (!response.ok) {
        const errorMessage = `Error: ${response.status} - ${response.statusText}`;
        setResponseError(errorMessage);
        return;
      }

      setShowPrompt(false);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#343541]">
      {showPrompt && !isProcessing && (
        <PromptModal
          key={modalKey}
          onSubmit={handleSubmit}
          initialValue=""
          initialDomain="http://localhost:8000"
        />
      )}
      
      {isProcessing && (
        <div className="fixed inset-0 bg-white dark:bg-[#343541] bg-opacity-75 dark:bg-opacity-75 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#76b900] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Processing Request...</p>
          </div>
        </div>
      )}

      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4 text-black dark:text-white">Agent IQ Authentication</h1>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="font-semibold text-red-800 dark:text-red-400">Client Error:</p>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {responseError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="font-semibold text-red-800 dark:text-red-400">Server Error:</p>
            <p className="text-red-700 dark:text-red-300">{responseError}</p>
          </div>
        )}

        {!showPrompt && !isProcessing && !error && !responseError && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
            <p className="text-green-700 dark:text-green-300">You are being redirected to your provider's consent screen to authorize access.</p>
          </div>
        )}

        {responseData && (responseError || error) && (
          <div className="bg-gray-800 text-gray-100 rounded-lg p-4 mb-4 font-mono text-sm overflow-x-auto">
            <p className="font-semibold mb-2">Response:</p>
            <pre className="whitespace-pre-wrap">{JSON.stringify(responseData, null, 2)}</pre>
          </div>
        )}

        {!showPrompt && !isProcessing && (
          <button
            onClick={() => {
              setShowPrompt(true);
              setError(null);
              setResponseError(null);
              setResponseData(null);
              setModalKey(prev => prev + 1);
            }}
            className="px-4 py-2 bg-[#76b900] text-white rounded hover:bg-[#5a9100] focus:outline-none transition-colors duration-200"
          >
            Open Authentication Prompt
          </button>
        )}
      </div>
    </div>
  );
} 