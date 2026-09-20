export async function uploadToCloudinary(file: File | Blob): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'work_connect_preset';

  if (!cloudName) {
    throw new Error('VITE_CLOUDINARY_CLOUD_NAME is not defined in environment variables.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Cloudinary upload failed: ${res.statusText}`);
  }

  const data = await res.json();
  return data.secure_url as string;
}
