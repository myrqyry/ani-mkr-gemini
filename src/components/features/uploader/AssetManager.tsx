import React, { useState, useCallback } from 'react';
import { uploadFile } from 'src/services/geminiService';

interface Asset {
  uri: string;
  name: string;
  mimeType: string;
}

interface AssetManagerProps {
  onAssetSelect: (asset: Asset) => void;
}

const AssetManager: React.FC<AssetManagerProps> = ({ onAssetSelect }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Convert FileReader to Promise to fix race condition
      const base64File = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
      });

      const result = await uploadFile(base64File, file.type);
      const newAsset: Asset = {
        uri: result.file.uri,
        name: file.name,
        mimeType: file.type,
      };
      setAssets(prevAssets => [...prevAssets, newAsset]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setUploading(false); // Now this happens at the right time!
    }
  }, []);

  return (
    <div className="w-full p-4 bg-gray-800 rounded-lg">
      <h3 className="text-lg font-bold mb-2">Asset Manager</h3>
      <div className="mb-4">
        <input type="file" onChange={handleFileUpload} disabled={uploading} />
        {uploading && <p>Uploading...</p>}
        {error && <p className="text-red-500">{error}</p>}
      </div>
      <div>
        <h4 className="font-bold mb-2">Uploaded Assets</h4>
        {assets.length === 0 ? (
          <p>No assets uploaded yet.</p>
        ) : (
          <ul>
            {assets.map((asset, index) => (
              <li key={index} className="flex justify-between items-center mb-2">
                <span>{asset.name}</span>
                <button
                  onClick={() => onAssetSelect(asset)}
                  className="bg-blue-500 text-white px-2 py-1 rounded"
                >
                  Use
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AssetManager;
