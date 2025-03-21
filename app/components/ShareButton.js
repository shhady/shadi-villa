'use client';

import { useState } from 'react';

export default function ShareButton({ title, description, iconOnly = false }) {
  const [copied, setCopied] = useState(false);
  
  // Handle share functionality
  const handleShare = async () => {
    const url = window.location.href;
    
    // Use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Villa c21',
          text: description || 'Check out this booking on Villa c21',
          url: url,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        // Fall back to clipboard copy if sharing fails
        copyToClipboard(url);
      }
    } else {
      // Fall back to clipboard copy if Web Share API is not available
      copyToClipboard(url);
    }
  };
  
  // Copy URL to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };
  
  return (
    <button 
      className={`cursor-pointer flex items-center text-blue-600 hover:text-blue-800 ${iconOnly ? 'p-1 hover:bg-blue-50 rounded-full' : ''}`}
      onClick={handleShare}
      aria-label="Share"
      title="Share booking"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={`${iconOnly ? 'h-5 w-5' : 'h-5 w-5 mr-1'}`}
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" 
        />
      </svg>
      {!iconOnly && (
        <span>
          {copied ? 'Copied!' : 'Share'}
        </span>
      )}
    </button>
  );
} 