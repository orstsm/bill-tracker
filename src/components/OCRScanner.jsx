import { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { Camera, X, ScanLine, Loader2 } from 'lucide-react';

export default function OCRScanner({ onScanResult, onClose }) {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImagePreview(URL.createObjectURL(file));
    setLoading(true);

    try {
      // Run OCR
      const { data: { text } } = await Tesseract.recognize(
        file,
        'eng',
        { logger: m => console.log(m) }
      );

      console.log("OCR Result Text:", text);

      // Simple regex to find amounts (e.g., PHP 1,500.00, P1500, 1500.00)
      const matches = text.match(/(?:PHP|P|₱)?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?/gi);
      
      let bestAmount = 0;
      if (matches && matches.length > 0) {
        // Find the most likely total amount (often the largest number or last large number)
        const amounts = matches.map(m => parseFloat(m.replace(/[^0-9.]/g, '')));
        bestAmount = Math.max(...amounts.filter(n => !isNaN(n)));
      }

      onScanResult(bestAmount);
    } catch (error) {
      console.error("OCR Error:", error);
      alert("Failed to scan receipt. Please enter amount manually.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div className="glass-card animate-fade-up" style={{ width: '100%', maxWidth: '400px', position: 'relative', textAlign: 'center' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
        >
          <X size={24} />
        </button>
        
        <ScanLine size={48} color="var(--accent)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ marginBottom: '8px', fontSize: '20px', fontWeight: 'bold' }}>Scan Receipt</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>
          Upload a screenshot of your bill or receipt to automatically extract the total amount.
        </p>

        {imagePreview && (
          <div style={{ marginBottom: '20px', borderRadius: '12px', overflow: 'hidden', height: '150px', background: 'rgba(0,0,0,0.2)' }}>
            <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--accent)' }}>
            <Loader2 className="animate-spin" size={32} style={{ animation: 'spin 2s linear infinite' }} />
            <span style={{ fontWeight: 'bold' }}>Scanning for amounts...</span>
          </div>
        ) : (
          <div>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current.click()}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--accent)', color: '#0f172a', fontWeight: 'bold', fontSize: '16px' }}
            >
              <Camera size={20} /> Upload Image
            </button>
          </div>
        )}

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}} />
      </div>
    </div>
  );
}
