import React from 'react';
import { extractTarGz } from '../utils/extractTarGz';
import JSZip from 'jszip';

function FileUploader({ onFileParsed }) {
  const handleFile = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const ext = file.name.toLowerCase();
    let parsedApps = [];

    try {
      if (ext.endsWith('.json')) {
        const text = await file.text();
        parsedApps.push(JSON.parse(text));
      } 
      else if (ext.endsWith('.tar.gz')) {
        parsedApps = await extractTarGz(file);
      } 
      else if (ext.endsWith('.zip')) {
        const zip = await JSZip().loadAsync(file);
        for (const filename of Object.keys(zip.files)) {
          if (filename.endsWith('.json')) {
            const content = await zip.files[filename].async('string');
            parsedApps.push(JSON.parse(content));
          }
        }
      } 
      else {
        alert('Unsupported file type. Please upload .json, .zip, or .tar.gz');
        return;
      }

      // Merge all parsed apps into one object for analysis
      const mergedApp = mergeApps(parsedApps);
      onFileParsed(mergedApp);

    } catch (err) {
      console.error('Error parsing file:', err);
      alert('Failed to parse the file.');
    }
  };

  const mergeApps = (apps) => {
    const merged = { steps: [], widgets: [], triggers: [], variables: [] };
    apps.forEach(app => {
      merged.steps.push(...(app.steps || []));
      merged.widgets.push(...(app.widgets || []));
      merged.triggers.push(...(app.triggers || []));
      merged.variables.push(...(app.variables || []));
    });
    return merged;
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <label
        style={{
          background: '#007bff',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Upload File
        <input
          type="file"
          accept=".json,.zip,.tar.gz"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </label>
    </div>
  );
}

export default FileUploader;
