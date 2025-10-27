import React, { useState, useRef } from 'react';
import { Send, Image as ImageIcon, Video, FileText, X, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

interface MessageInputProps {
  onSend: (message: string, files: File[]) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  maxFiles?: number;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Mesajınızı yazın...',
  maxFiles = 5
}) => {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (files.length + selectedFiles.length > maxFiles) {
      toast.error(`En fazla ${maxFiles} dosya yükleyebilirsiniz`);
      return;
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    const newPreviewUrls: string[] = [];

    selectedFiles.forEach(file => {
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        toast.error(`${file.name} çok büyük (max 50MB)`);
        return;
      }

      validFiles.push(file);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        newPreviewUrls.push(url);
      } else if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        newPreviewUrls.push(url);
      } else {
        newPreviewUrls.push(''); // No preview for documents
      }
    });

    setFiles(prev => [...prev, ...validFiles]);
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    // Revoke object URL to prevent memory leaks
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index]);
    }

    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    previewUrls.forEach(url => {
      if (url) URL.revokeObjectURL(url);
    });
    setFiles([]);
    setPreviewUrls([]);
  };

  const handleSend = async () => {
    if (!message.trim() && files.length === 0) {
      toast.error('Mesaj veya dosya ekleyin');
      return;
    }

    setSending(true);
    try {
      await onSend(message.trim(), files);
      setMessage('');
      clearAll();
    } catch (error) {
      console.error('Send error:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon size={16} />;
    if (file.type.startsWith('video/')) return <Video size={16} />;
    return <FileText size={16} />;
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {/* File previews */}
      {files.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="relative group"
            >
              {/* Preview or icon */}
              <div className="w-20 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                {file.type.startsWith('image/') && previewUrls[index] ? (
                  <img
                    src={previewUrls[index]}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : file.type.startsWith('video/') && previewUrls[index] ? (
                  <video
                    src={previewUrls[index]}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400">
                    {getFileIcon(file)}
                  </div>
                )}
              </div>

              {/* Remove button */}
              <button
                onClick={() => removeFile(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Kaldır"
              >
                <X size={14} />
              </button>

              {/* File name */}
              <div className="text-xs text-gray-600 mt-1 max-w-[80px] truncate text-center">
                {file.name}
              </div>
            </div>
          ))}

          {/* Clear all button */}
          {files.length > 1 && (
            <button
              onClick={clearAll}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:border-red-400 hover:text-red-500 transition-colors"
            >
              <X size={20} />
              <span className="text-xs mt-1">Tümünü Sil</span>
            </button>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        {/* File input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          className="hidden"
        />

        {/* Attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending || files.length >= maxFiles}
          className="flex-shrink-0 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Dosya Ekle"
        >
          <ImageIcon size={20} />
        </button>

        {/* Text input */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled || sending}
          rows={1}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          style={{ minHeight: '40px', maxHeight: '120px' }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || sending || (!message.trim() && files.length === 0)}
          className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {sending ? (
            <>
              <Loader size={18} className="animate-spin" />
              <span>Gönderiliyor...</span>
            </>
          ) : (
            <>
              <Send size={18} />
              <span>Gönder</span>
            </>
          )}
        </button>
      </div>

      {/* File count indicator */}
      {files.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {files.length} dosya seçildi (max {maxFiles})
        </div>
      )}
    </div>
  );
};

