import React from 'react';
import JSZip from 'jszip';

const FileUploader = ({ onFileParsed }) => {
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.json')) {
      const text = await file.text();
      try {
        const json = JSON.parse(text);
        onFileParsed(json);
      } catch (err) {
        alert('Invalid JSON file');
      }
    } else if (file.name.endsWith('.zip')) {
      const zip = new JSZip();
      try {
        const content = await zip.loadAsync(file);
        const jsonFileName = Object.keys(content.files).find((name) =>
          name.endsWith('.json')
        );
        if (!jsonFileName) {
          alert('No JSON file found in the ZIP');
          return;
        }
        const jsonText = await content.files[jsonFileName].async('text');
        const json = JSON.parse(jsonText);
        onFileParsed(json);
      } catch (err) {
        alert('Failed to read ZIP or parse JSON inside.');
      }
    } else {
      alert('Please upload a .json or .zip file');
    }
  };

  return <input type="file" accept=".json,.zip" onChange={handleFileChange} />;
};

export default FileUploader;
