import React, { useState } from 'react';
import { Sparkles, X, Loader2, Wand2, Palette, Type, Image as ImageIcon, Square } from 'lucide-react';

interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string, style: string) => void;
  isGenerating: boolean;
}

const AIModal: React.FC<AIModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  isGenerating
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('modern');

  const styles = [
    { id: 'modern', name: 'Modern', icon: Sparkles, description: 'Temiz ve çağdaş tasarım' },
    { id: 'vintage', name: 'Vintage', icon: Palette, description: 'Retro ve nostaljik görünüm' },
    { id: 'minimalist', name: 'Minimalist', icon: Square, description: 'Sade ve basit tasarım' },
    { id: 'corporate', name: 'Kurumsal', icon: Type, description: 'Profesyonel iş tasarımı' },
    { id: 'creative', name: 'Yaratıcı', icon: Wand2, description: 'Sanatsal ve yaratıcı' },
    { id: 'social', name: 'Sosyal Medya', icon: ImageIcon, description: 'Instagram/Facebook için' }
  ];

  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerate(prompt, selectedStyle);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Şablon Oluşturucu</h2>
              <p className="text-sm text-gray-600">İstediğiniz şablonu AI ile oluşturun</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Şablon Açıklaması
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Örnek: Bir restoran için modern ve şık menü kartı tasarımı. Logo üstte, yemek listesi ortada, iletişim bilgileri altta olsun..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 text-sm"
              disabled={isGenerating}
            />
            <p className="text-xs text-gray-500 mt-1">
              Ne tür bir şablon istediğinizi detaylı olarak açıklayın
            </p>
          </div>

          {/* Style Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tasarım Stili
            </label>
            <div className="grid grid-cols-2 gap-3">
              {styles.map(style => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  disabled={isGenerating}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    selectedStyle === style.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <style.icon size={16} className="text-gray-600" />
                    <span className="font-medium text-sm">{style.name}</span>
                  </div>
                  <p className="text-xs text-gray-500">{style.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Examples */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Örnek İstekler
            </label>
            <div className="space-y-2">
              {[
                "Bir kafe için vintage tarzda menü kartı",
                "E-ticaret ürün tanıtım posteri",
                "Düğün davetiyesi tasarımı",
                "Kurumsal sunum şablonu",
                "Sosyal medya hikaye şablonu"
              ].map((example, index) => (
                <button
                  key={index}
                  onClick={() => setPrompt(example)}
                  disabled={isGenerating}
                  className="w-full text-left p-2 text-sm text-gray-600 hover:bg-gray-50 rounded border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500">
            AI, açık kaynak kodlu modeller kullanarak şablon oluşturur
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              İptal
            </button>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Oluştur
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIModal;
