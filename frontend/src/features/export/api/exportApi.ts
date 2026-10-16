import axiosInstance from '@/lib/axios';

export const exportApi = {
  exportFindings: async (
    workspaceId: string, 
    format: 'json' | 'csv' | 'sarif', 
    signal?: AbortSignal
  ) => {
    const res = await axiosInstance.get(`/export/${workspaceId}/findings?format=${format}`, {
      responseType: 'blob',
      signal
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Set appropriate extension
    let extension: string = format;
    if (format === 'sarif') extension = 'sarif.json';
    link.setAttribute('download', `findings-export.${extension}`);
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  }
};
