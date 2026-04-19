import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, AlertCircle, CheckCircle, Camera, FileText, Info, Shield, XCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface KYCVerification {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
}

interface KYCDocument {
  id: string;
  type: 'id_front' | 'id_back' | 'selfie';
  file_url: string;
}

export default function KYC() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [verification, setVerification] = useState<KYCVerification | null>(null);
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{
    id_front?: File;
    id_back?: File;
    selfie?: File;
  }>({});

  useEffect(() => {
    loadKYCStatus();
  }, [user]);

  const loadKYCStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get latest verification
      const { data: verificationData, error: verificationError } = await supabase
        .from('kyc_verifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (verificationError && verificationError.code !== 'PGRST116') {
        throw verificationError;
      }

      if (verificationData) {
        setVerification(verificationData);

        // Get documents
        const { data: documentsData, error: documentsError } = await supabase
          .from('kyc_documents')
          .select('*')
          .eq('verification_id', verificationData.id);

        if (documentsError) throw documentsError;
        setDocuments(documentsData || []);
      }
    } catch (err) {
      console.error('Error loading KYC status:', err);
      setError('Failed to load KYC status');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (type: 'id_front' | 'id_back' | 'selfie', file: File) => {
    setUploadedFiles(prev => ({
      ...prev,
      [type]: file
    }));
  };

  const handleSubmit = async () => {
    if (!uploadedFiles.id_front || !uploadedFiles.id_back || !uploadedFiles.selfie) {
      setError('Please upload all required documents');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Get or create verification
      let currentVerification = verification;
      
      if (!currentVerification) {
        const { data: newVerification, error: verificationError } = await supabase
          .from('kyc_verifications')
          .insert([{ user_id: user!.id }])
          .select()
          .single();

        if (verificationError) throw verificationError;
        currentVerification = newVerification;
        setVerification(newVerification);
      } else if (currentVerification.status === 'rejected') {
        // Reset status to pending if re-submitting
        const { data: updatedVerification, error: updateError } = await supabase
          .from('kyc_verifications')
          .update({ status: 'pending', rejection_reason: null })
          .eq('id', currentVerification.id)
          .select()
          .single();
          
        if (updateError) throw updateError;
        currentVerification = updatedVerification;
        setVerification(updatedVerification);
      }

      // Upload all files
      for (const [type, file] of Object.entries(uploadedFiles)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user!.id}/${currentVerification.id}/${type}.${fileExt}`;

        // Upload with upsert to replace old files if they exist
        const { error: uploadError } = await supabase.storage
          .from('kyc-documents')
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('kyc-documents')
          .getPublicUrl(fileName);

        // Save or update document reference
        const { error: documentError } = await supabase
          .from('kyc_documents')
          .upsert({
            verification_id: currentVerification.id,
            type,
            file_url: publicUrl
          }, { onConflict: 'verification_id,type' });

        if (documentError) throw documentError;
      }

      // Reload documents and status
      await loadKYCStatus();
      setSuccess('Documents submitted successfully! We will review them shortly.');
    } catch (err) {
      console.error('Error uploading documents:', err);
      setError('Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">KYC Verification</h1>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {verification?.status === 'approved' ? (
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex-shrink-0 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">KYC Verification Approved</h2>
              <p className="text-gray-300 mb-4">
                Your identity has been successfully verified. You now have full access to all platform features.
              </p>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-green-400 font-medium mb-2">Verification Benefits:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-300">
                      <li>Increased withdrawal limits</li>
                      <li>Access to all trading features</li>
                      <li>Priority support access</li>
                      <li>Enhanced account security</li>
                    </ul>
                  </div>
                </div>
              </div>

              {documents.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Verified Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {documents.map((doc) => (
                      <div key={doc.id} className="relative">
                        <img
                          src={doc.file_url}
                          alt={doc.type}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/50 rounded-b-lg">
                          <p className="text-sm text-white text-center capitalize">
                            {doc.type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : verification?.status === 'rejected' ? (
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex-shrink-0 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">KYC Verification Rejected</h2>
              {verification.rejection_reason && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div>
                      <p className="text-red-400 font-medium mb-2">Reason for Rejection:</p>
                      <p className="text-gray-300">{verification.rejection_reason}</p>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-gray-300 mb-4">
                Please review the rejection reason and submit new documents that meet our requirements.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Instructions Card - Only show if not approved */}
      {verification?.status !== 'approved' && (
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex-shrink-0 flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">KYC Instructions</h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  To comply with regulations and ensure account security, we require verification of your identity. 
                  Please provide the following documents:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <FileText className="w-5 h-5 text-blue-400 mt-0.5" />
                    <span>A valid government-issued ID card (front and back)</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Camera className="w-5 h-5 text-blue-400 mt-0.5" />
                    <span>A clear selfie photo of yourself</span>
                  </div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div className="text-yellow-400">
                      <p className="font-medium mb-2">Important Notes:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Documents must be valid and not expired</li>
                        <li>Images must be clear and readable</li>
                        <li>Selfie should clearly show your face</li>
                        <li>Files should be in JPG, PNG, or PDF format</li>
                        <li>Maximum file size: 5MB per document</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Section - Only show if not approved */}
      {verification?.status !== 'approved' && (
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="space-y-6">
            {/* Status Section */}
            {verification && (
              <div className="mb-8">
                <div className={`inline-flex items-center px-4 py-2 rounded-full ${
                  verification.status === 'approved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                  verification.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                }`}>
                  {verification.status === 'approved' ? (
                    <CheckCircle className="w-5 h-5 mr-2" />
                  ) : verification.status === 'rejected' ? (
                    <XCircle className="w-5 h-5 mr-2" />
                  ) : (
                    <Upload className="w-5 h-5 mr-2" />
                  )}
                  <span className="font-medium capitalize">{verification.status}</span>
                </div>

                {verification.rejection_reason && (
                  <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-red-400">{verification.rejection_reason}</p>
                  </div>
                )}
              </div>
            )}

            {/* Upload Section */}
            {(!verification || verification.status === 'rejected') && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* ID Front */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">ID Card Front</h3>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect('id_front', file);
                        }}
                        className="hidden"
                        id="id-front"
                        disabled={uploading}
                      />
                      <label
                        htmlFor="id-front"
                        className={`flex flex-col items-center justify-center w-full h-48 rounded-lg border-2 border-dashed ${
                          uploadedFiles.id_front 
                            ? 'border-green-500/50 bg-green-500/5' 
                            : 'border-gray-600 hover:border-gray-500 bg-white/5'
                        } cursor-pointer transition-colors`}
                      >
                        {uploadedFiles.id_front ? (
                          <div className="text-center">
                            <CheckCircle className="w-8 h-8 text-green-400 mb-2 mx-auto" />
                            <p className="text-sm text-green-400">{uploadedFiles.id_front.name}</p>
                          </div>
                        ) : (
                          <>
                            <FileText className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-400">Click to upload ID front</p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* ID Back */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">ID Card Back</h3>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect('id_back', file);
                        }}
                        className="hidden"
                        id="id-back"
                        disabled={uploading}
                      />
                      <label
                        htmlFor="id-back"
                        className={`flex flex-col items-center justify-center w-full h-48 rounded-lg border-2 border-dashed ${
                          uploadedFiles.id_back 
                            ? 'border-green-500/50 bg-green-500/5' 
                            : 'border-gray-600 hover:border-gray-500 bg-white/5'
                        } cursor-pointer transition-colors`}
                      >
                        {uploadedFiles.id_back ? (
                          <div className="text-center">
                            <CheckCircle className="w-8 h-8 text-green-400 mb-2 mx-auto" />
                            <p className="text-sm text-green-400">{uploadedFiles.id_back.name}</p>
                          </div>
                        ) : (
                          <>
                            <FileText className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-400">Click to upload ID back</p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Selfie */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Selfie</h3>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect('selfie', file);
                        }}
                        className="hidden"
                        id="selfie"
                        disabled={uploading}
                      />
                      <label
                        htmlFor="selfie"
                        className={`flex flex-col items-center justify-center w-full h-48 rounded-lg border-2 border-dashed ${
                          uploadedFiles.selfie 
                            ? 'border-green-500/50 bg-green-500/5' 
                            : 'border-gray-600 hover:border-gray-500 bg-white/5'
                        } cursor-pointer transition-colors`}
                      >
                        {uploadedFiles.selfie ? (
                          <div className="text-center">
                            <CheckCircle className="w-8 h-8 text-green-400 mb-2 mx-auto" />
                            <p className="text-sm text-green-400">{uploadedFiles.selfie.name}</p>
                          </div>
                        ) : (
                          <>
                            <Camera className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-400">Click to upload selfie</p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSubmit}
                    disabled={uploading || !uploadedFiles.id_front || !uploadedFiles.id_back || !uploadedFiles.selfie}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" />
                        Submit Documents
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Uploaded Documents Preview */}
            {documents.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-white mb-4">Uploaded Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {documents.map((doc) => (
                    <div key={doc.id} className="relative">
                      <img
                        src={doc.file_url}
                        alt={doc.type}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/50 rounded-b-lg">
                        <p className="text-sm text-white text-center capitalize">
                          {doc.type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}