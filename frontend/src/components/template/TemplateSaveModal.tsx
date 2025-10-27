import React from 'react';

interface TemplateSaveModalProps {
  isOpen: boolean;
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  onSave: () => void;
  onClose: () => void;
}

const TemplateSaveModal: React.FC<TemplateSaveModalProps> = ({
  isOpen,
  templateName,
  onTemplateNameChange,
  onSave,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Şablonu Kaydet</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Şablon Adı
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => onTemplateNameChange(e.target.value)}
              placeholder="Şablon adını girin..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={!templateName.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TemplateSaveModal;
