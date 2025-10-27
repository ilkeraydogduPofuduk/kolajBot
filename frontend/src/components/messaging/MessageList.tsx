import React, { useEffect, useRef } from 'react';
import { Image as ImageIcon, Video, File, User, Bot } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
}

interface MessageListProps {
  messages: Message[];
  loading?: boolean;
  autoScroll?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  loading = false,
  autoScroll = true
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, autoScroll]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('tr-TR', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const renderMediaPreview = (message: Message) => {
    if (!message.mediaUrl) return null;

    const mediaType = message.mediaType || 'document';

    if (mediaType === 'image') {
      return (
        <div className="mt-2">
          <img
            src={message.mediaUrl}
            alt="Shared media"
            className="max-w-xs rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => window.open(message.mediaUrl!, '_blank')}
            loading="lazy"
          />
        </div>
      );
    }

    if (mediaType === 'video') {
      return (
        <div className="mt-2">
          <video
            src={message.mediaUrl}
            controls
            className="max-w-xs rounded-lg shadow-md"
            preload="metadata"
          />
        </div>
      );
    }

    // Document
    return (
      <a
        href={message.mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <File size={16} />
        <span className="text-sm">Dosyayı Aç</span>
      </a>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
          <p className="text-gray-600">Mesajlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-lg">Henüz mesaj yok</p>
          <p className="text-sm mt-2">İlk mesajı göndererek başlayın</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={messagesContainerRef}
      className="space-y-4 p-4"
    >
      {messages.map((message, index) => {
        const isBot = message.sender === 'bot';
        const showDateSeparator = index === 0 || 
          new Date(messages[index - 1].timestamp).toDateString() !== new Date(message.timestamp).toDateString();

        return (
          <div key={message.id}>
            {/* Date separator */}
            {showDateSeparator && (
              <div className="flex items-center justify-center my-4">
                <div className="px-3 py-1 bg-gray-200 rounded-full text-xs text-gray-600">
                  {new Date(message.timestamp).toLocaleDateString('tr-TR', { 
                    day: 'numeric', 
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>
            )}

            {/* Message */}
            <div className={`flex items-start gap-3 ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                isBot ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                {isBot ? (
                  <Bot size={16} className="text-blue-600" />
                ) : (
                  <User size={16} className="text-green-600" />
                )}
              </div>

              {/* Message content */}
              <div className={`flex flex-col max-w-[70%] ${isBot ? 'items-start' : 'items-end'}`}>
                <div className={`px-4 py-2 rounded-lg ${
                  isBot 
                    ? 'bg-gray-100 text-gray-900' 
                    : 'bg-blue-600 text-white'
                }`}>
                  {message.text && (
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.text}
                    </p>
                  )}
                  {renderMediaPreview(message)}
                </div>
                <span className="text-xs text-gray-500 mt-1 px-1">
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

